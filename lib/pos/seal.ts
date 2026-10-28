import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Encryption for POS access tokens at rest, and signed OAuth `state` values.
 * Both derive from the agent-tool signing secret, so no extra secret has to be configured.
 */
function rootSecret(): string {
  const secret = process.env.AGENT_TOOL_SIGNING_SECRET?.trim() || process.env.AGENT_TOOL_SECRET?.trim();
  if (!secret) throw new Error("AGENT_TOOL_SIGNING_SECRET is not set.");
  return secret;
}

function key(purpose: string): Buffer {
  return createHash("sha256").update(`${rootSecret()}:${purpose}`).digest();
}

/** AES-256-GCM: returns `iv.tag.ciphertext`, each base64url. */
export function sealSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key("roal-pos-token-v1"), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function openSecret(sealed: string): string {
  const [iv, tag, data] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !data) throw new Error("Malformed sealed value.");
  const decipher = createDecipheriv("aes-256-gcm", key("roal-pos-token-v1"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export type OAuthState = { restaurantId: string; userId: string; exp: number };

export function signOAuthState(state: Omit<OAuthState, "exp">, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ ...state, exp: Math.floor(now / 1000) + 15 * 60 })).toString("base64url");
  const sig = createHmac("sha256", key("roal-pos-state-v1")).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyOAuthState(token: string | null, now = Date.now()): OAuthState | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", key("roal-pos-state-v1")).update(body).digest("base64url");
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthState;
    if (typeof parsed.restaurantId !== "string" || typeof parsed.userId !== "string") return null;
    if (!Number.isFinite(parsed.exp) || parsed.exp < Math.floor(now / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}
