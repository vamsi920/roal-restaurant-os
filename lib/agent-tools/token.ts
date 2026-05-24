import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const AGENT_TOOL_TOKEN_PREFIX = "roal1";

export const AGENT_TOOL_RESTAURANT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeRestaurantUuid(value: string): string {
  return value.trim().toLowerCase();
}

export type AgentToolTokenClaims = {
  v: 1;
  rid: string;
  exp: number;
  iat: number;
  jti: string;
  aid?: string;
};

function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

export function getAgentToolSigningSecret(): string | null {
  const signing =
    process.env.AGENT_TOOL_SIGNING_SECRET?.trim() ||
    process.env.AGENT_TOOL_SECRET?.trim();
  return signing || null;
}

export function mintAgentToolToken(input: {
  restaurantId: string;
  agentId?: string | null;
  /** Default 90 days */
  expiresInSec?: number;
}): string {
  const secret = getAgentToolSigningSecret();
  if (!secret) {
    throw new Error(
      "AGENT_TOOL_SIGNING_SECRET or AGENT_TOOL_SECRET is required to mint tool tokens"
    );
  }
  const restaurantId = normalizeRestaurantUuid(input.restaurantId);
  if (!AGENT_TOOL_RESTAURANT_ID_RE.test(restaurantId)) {
    throw new Error("restaurantId must be a valid UUID");
  }

  const now = Math.floor(Date.now() / 1000);
  const ttl = input.expiresInSec ?? 90 * 24 * 60 * 60;
  const claims: AgentToolTokenClaims = {
    v: 1,
    rid: restaurantId,
    iat: now,
    exp: now + ttl,
    jti: randomUUID(),
  };
  if (input.agentId?.trim()) {
    claims.aid = input.agentId.trim();
  }

  const payload = base64UrlEncode(JSON.stringify(claims));
  const sig = base64UrlEncode(
    createHmac("sha256", secret).update(`${AGENT_TOOL_TOKEN_PREFIX}.${payload}`).digest()
  );
  return `${AGENT_TOOL_TOKEN_PREFIX}.${payload}.${sig}`;
}

export function verifyAgentToolToken(
  token: string,
  signingSecret: string
): { ok: true; claims: AgentToolTokenClaims } | { ok: false; error: string } {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== AGENT_TOOL_TOKEN_PREFIX) {
    return { ok: false, error: "invalid_token_format" };
  }

  const [, payload, sig] = parts;
  const expectedSig = createHmac("sha256", signingSecret)
    .update(`${AGENT_TOOL_TOKEN_PREFIX}.${payload}`)
    .digest();
  const expected = base64UrlEncode(expectedSig);

  try {
    const a = base64UrlDecode(sig);
    const b = base64UrlDecode(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "invalid_signature" };
    }
  } catch {
    return { ok: false, error: "invalid_signature" };
  }

  let claims: AgentToolTokenClaims;
  try {
    claims = JSON.parse(base64UrlDecode(payload).toString("utf8")) as AgentToolTokenClaims;
  } catch {
    return { ok: false, error: "invalid_payload" };
  }

  if (
    claims.v !== 1 ||
    typeof claims.rid !== "string" ||
    !claims.rid ||
    !AGENT_TOOL_RESTAURANT_ID_RE.test(claims.rid)
  ) {
    return { ok: false, error: "invalid_claims" };
  }
  claims.rid = normalizeRestaurantUuid(claims.rid);

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== "number" || !Number.isFinite(claims.exp) || claims.exp <= now) {
    return { ok: false, error: "token_expired" };
  }

  return { ok: true, claims };
}

export function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

export function isSignedAgentToolToken(token: string): boolean {
  return token.startsWith(`${AGENT_TOOL_TOKEN_PREFIX}.`);
}
