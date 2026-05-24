import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  getSigningSecrets,
  isSignedAgentToolToken,
  parseBearerToken,
  timingSafeSecretEqual,
  verifyAgentToolToken,
  type AgentToolTokenClaims,
} from "./agent-tool-token.ts";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ROAL_RESTAURANT_ID_HEADER = "x-roal-restaurant-id";
export const ROAL_IDEMPOTENCY_HEADER = "x-roal-idempotency-key";

export type AgentToolAuthResult =
  | {
      ok: true;
      restaurantId: string;
      mode: "signed" | "legacy";
      claims?: AgentToolTokenClaims;
    }
  | { ok: false; status: number; body: Record<string, unknown> };

function normalizeRestaurantUuid(value: string): string {
  return value.trim().toLowerCase();
}

function pushRestaurantCandidate(candidates: string[], raw: string | null | undefined): void {
  if (typeof raw !== "string") return;
  const trimmed = raw.trim();
  if (!UUID_RE.test(trimmed)) return;
  candidates.push(normalizeRestaurantUuid(trimmed));
}

export function resolveRestaurantId(input: {
  fromHeader: string | null;
  fromBody: unknown;
  fromQuery: string | null;
  tokenRestaurantId?: string;
}): string | null {
  const candidates: string[] = [];
  pushRestaurantCandidate(candidates, input.tokenRestaurantId);
  if (typeof input.fromBody === "string") {
    pushRestaurantCandidate(candidates, input.fromBody);
  }
  pushRestaurantCandidate(candidates, input.fromHeader);
  pushRestaurantCandidate(candidates, input.fromQuery);

  if (candidates.length === 0) return null;
  const first = candidates[0];
  if (candidates.some((c) => c !== first)) {
    return null;
  }
  return first;
}

export async function authenticateAgentToolRequest(
  req: Request,
  bodyRestaurantId: unknown,
  queryRestaurantId?: string | null
): Promise<AgentToolAuthResult> {
  const { signing, legacy } = getSigningSecrets();
  if (!signing && !legacy) {
    return {
      ok: false,
      status: 500,
      body: { error: "Server misconfigured", code: "missing_tool_secrets" },
    };
  }

  const bearer = parseBearerToken(req.headers.get("Authorization"));
  if (!bearer) {
    return {
      ok: false,
      status: 401,
      body: { error: "Unauthorized", code: "missing_bearer" },
    };
  }

  const fromHeader = req.headers.get(ROAL_RESTAURANT_ID_HEADER)?.trim() ?? null;

  if (isSignedAgentToolToken(bearer)) {
    if (!signing) {
      return {
        ok: false,
        status: 401,
        body: { error: "Unauthorized", code: "signing_not_configured" },
      };
    }
    const verified = await verifyAgentToolToken(bearer, signing);
    if (!verified.ok) {
      const message =
        verified.error === "token_expired"
          ? "Signed tool token expired. Re-sync the voice agent on the KDS."
          : verified.error === "invalid_signature"
            ? "Signed tool token signature is invalid."
            : "Signed tool token is invalid.";
      return {
        ok: false,
        status: 401,
        body: {
          error: "Unauthorized",
          code: verified.error,
          message,
          recovery_hint:
            verified.error === "token_expired"
              ? "Connect or Re-sync the agent to mint a fresh roal1.* token."
              : "Use the Authorization header from Connect agent, not a stale copy.",
        },
      };
    }

    const restaurantId = resolveRestaurantId({
      fromHeader,
      fromBody: bodyRestaurantId,
      fromQuery: queryRestaurantId ?? null,
      tokenRestaurantId: verified.claims.rid,
    });

    if (!restaurantId) {
      return {
        ok: false,
        status: 400,
        body: {
          error: "restaurant_id mismatch or missing",
          code: "restaurant_id_mismatch",
          hint: "Token restaurant must match x-roal-restaurant-id header or JSON body restaurant_id.",
        },
      };
    }

    if (restaurantId !== verified.claims.rid) {
      return {
        ok: false,
        status: 403,
        body: {
          error: "Token not valid for this restaurant",
          code: "restaurant_scope_violation",
        },
      };
    }

    return {
      ok: true,
      restaurantId,
      mode: "signed",
      claims: verified.claims,
    };
  }

  if (!legacy) {
    return {
      ok: false,
      status: 401,
      body: {
        error: "Unauthorized",
        code: "legacy_secret_disabled",
        hint: "Use a signed roal1.* token from Connect agent, or set AGENT_TOOL_SECRET.",
      },
    };
  }

  const legacyOk = await timingSafeSecretEqual(bearer, legacy);
  if (!legacyOk) {
    return {
      ok: false,
      status: 401,
      body: { error: "Unauthorized", code: "invalid_legacy_secret" },
    };
  }

  const restaurantId = resolveRestaurantId({
    fromHeader,
    fromBody: bodyRestaurantId,
    fromQuery: queryRestaurantId ?? null,
  });

  if (!restaurantId) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "missing_restaurant_id",
        code: "missing_restaurant_id",
        message:
          "restaurant_id is required (uuid in JSON body, query, or x-roal-restaurant-id header).",
        recovery_hint:
          "Connect the voice agent on the KDS or pass restaurant_id that matches the signed token.",
      },
    };
  }

  return { ok: true, restaurantId, mode: "legacy" };
}

export async function assertRestaurantToolOwnership(
  supabase: SupabaseClient,
  restaurantId: string,
  auth: Extract<AgentToolAuthResult, { ok: true }>
): Promise<{ ok: true } | { ok: false; status: number; body: Record<string, unknown> }> {
  const { data: restaurant, error: rErr } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .maybeSingle();

  if (rErr) {
    return { ok: false, status: 500, body: { error: rErr.message } };
  }
  if (!restaurant) {
    return { ok: false, status: 404, body: { error: "Restaurant not found" } };
  }

  const { data: profile, error: pErr } = await supabase
    .from("restaurant_profiles")
    .select("elevenlabs_agent_id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (pErr) {
    return { ok: false, status: 500, body: { error: pErr.message } };
  }

  if (auth.mode === "signed") {
    if (auth.claims?.aid && profile?.elevenlabs_agent_id) {
      if (auth.claims.aid !== profile.elevenlabs_agent_id) {
        return {
          ok: false,
          status: 403,
          body: {
            error: "Agent not authorized for this restaurant",
            code: "agent_restaurant_mismatch",
          },
        };
      }
    }
    return { ok: true };
  }

  // Legacy global secret: require an agent connection on the profile (baked-tool path).
  if (!profile?.elevenlabs_agent_id) {
    return {
      ok: false,
      status: 403,
      body: {
        error: "Restaurant voice agent not connected",
        code: "agent_not_connected",
        hint: "Connect the ElevenLabs agent on the KDS page to enable tool access.",
      },
    };
  }

  return { ok: true };
}

export function readIdempotencyKey(
  req: Request,
  body: Record<string, unknown>
): { ok: true; key: string | null } | { ok: false; status: number; body: Record<string, unknown> } {
  const header = req.headers.get(ROAL_IDEMPOTENCY_HEADER)?.trim();
  if (header && header.length > 128) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "idempotency_key_too_long",
        code: "idempotency_key_too_long",
        message: "x-roal-idempotency-key must be at most 128 characters.",
      },
    };
  }
  if (header && header.length > 0) return { ok: true, key: header };

  const fromBody = body.idempotency_key;
  if (typeof fromBody === "string" && fromBody.trim().length > 0) {
    const key = fromBody.trim();
    if (key.length > 128) {
      return {
        ok: false,
        status: 400,
        body: {
          error: "idempotency_key_too_long",
          code: "idempotency_key_too_long",
          message: "idempotency_key must be at most 128 characters.",
        },
      };
    }
    return { ok: true, key };
  }
  return { ok: true, key: null };
}
