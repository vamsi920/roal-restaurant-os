const TOKEN_PREFIX = "roal1";

const RESTAURANT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AgentToolTokenClaims = {
  v: 1;
  rid: string;
  exp: number;
  iat: number;
  jti: string;
  aid?: string;
};

function base64UrlEncode(bytes: Uint8Array): string {
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return new Uint8Array(sig);
}

export function getSigningSecrets(): {
  signing: string | null;
  legacy: string | null;
} {
  const signing = Deno.env.get("AGENT_TOOL_SIGNING_SECRET")?.trim() || null;
  const legacy = Deno.env.get("AGENT_TOOL_SECRET")?.trim() || null;
  return {
    signing: signing || legacy,
    legacy,
  };
}

export async function verifyAgentToolToken(
  token: string,
  signingSecret: string
): Promise<{ ok: true; claims: AgentToolTokenClaims } | { ok: false; error: string }> {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
    return { ok: false, error: "invalid_token_format" };
  }

  const payload = parts[1];
  const sig = parts[2];
  const expected = base64UrlEncode(
    await hmacSha256(signingSecret, `${TOKEN_PREFIX}.${payload}`)
  );

  try {
    const a = base64UrlDecode(sig);
    const b = base64UrlDecode(expected);
    if (!timingSafeEqual(a, b)) {
      return { ok: false, error: "invalid_signature" };
    }
  } catch {
    return { ok: false, error: "invalid_signature" };
  }

  let claims: AgentToolTokenClaims;
  try {
    claims = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payload))
    ) as AgentToolTokenClaims;
  } catch {
    return { ok: false, error: "invalid_payload" };
  }

  if (
    claims.v !== 1 ||
    typeof claims.rid !== "string" ||
    !claims.rid ||
    !RESTAURANT_ID_RE.test(claims.rid)
  ) {
    return { ok: false, error: "invalid_claims" };
  }
  claims.rid = claims.rid.trim().toLowerCase();

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
  return token.startsWith(`${TOKEN_PREFIX}.`);
}

export async function timingSafeSecretEqual(
  provided: string,
  expected: string
): Promise<boolean> {
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
