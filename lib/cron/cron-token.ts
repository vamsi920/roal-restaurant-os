import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Background jobs (Netlify scheduled functions) call app routes with a token derived from the
 * agent-tool signing secret, so no extra secret has to be configured. Keep the derivation in
 * sync with netlify/functions/*.mts.
 */
export function cronToken(signingSecret: string): string {
  return createHmac("sha256", signingSecret).update("roal-cron-v1").digest("hex");
}

export function isValidCronRequest(req: Request, signingSecret: string | undefined): boolean {
  const secret = signingSecret?.trim();
  if (!secret) return false;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const expected = cronToken(secret);
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
