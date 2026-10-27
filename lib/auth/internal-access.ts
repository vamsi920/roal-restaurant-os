import "server-only";
import { getSessionUser } from "@/lib/auth/session";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { getElevenLabsSyncToken } from "@/lib/env.server";

/**
 * Guards for platform-internal routes (ElevenLabs agent admin, tool sync) that are
 * not scoped to one tenant. Allowed when the caller presents the ops bearer token
 * (`ELEVENLABS_SYNC_TOKEN`) or is signed in as platform staff. Fails closed when
 * neither is available — there is no "token unset means open" mode.
 */
export function hasValidOpsBearer(req: Request): boolean {
  const token = getElevenLabsSyncToken()?.trim();
  if (!token) return false;
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!bearer || bearer.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i += 1) diff |= token.charCodeAt(i) ^ bearer.charCodeAt(i);
  return diff === 0;
}

export async function isPlatformAdminSession(): Promise<boolean> {
  try {
    const user = await getSessionUser();
    return Boolean(user && isPlatformAdminEmail(user.email));
  } catch {
    return false;
  }
}

export async function authorizeInternalOpsRequest(req: Request): Promise<boolean> {
  if (hasValidOpsBearer(req)) return true;
  return isPlatformAdminSession();
}
