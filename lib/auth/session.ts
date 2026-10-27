import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAuthDemoMode } from "@/lib/auth/demo-mode";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import {
  DEMO_SESSION_COOKIE,
  DEMO_USER,
  SESSION_COOKIE,
  type SessionUser,
} from "@/lib/auth/session-user";

export type { SessionUser } from "@/lib/auth/session-user";

/** Verify the Firebase session cookie (or the demo cookie in demo mode). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = cookies();
  if (isAuthDemoMode()) {
    return jar.get(DEMO_SESSION_COOKIE)?.value === DEMO_USER.id ? DEMO_USER : null;
  }
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { adminAuth } = await import("@/lib/firebase/admin");
    const decoded = await adminAuth().verifySessionCookie(token, false);
    const rawEmail = typeof decoded.email === "string" ? decoded.email : null;
    // Platform-admin rights are keyed by email; never trust an unverified claim to one.
    const email =
      rawEmail && decoded.email_verified !== true && isPlatformAdminEmail(rawEmail) ? null : rawEmail;
    return {
      id: decoded.uid,
      email,
      user_metadata: {
        full_name: typeof decoded.name === "string" ? decoded.name : undefined,
        avatar_url: typeof decoded.picture === "string" ? decoded.picture : undefined,
      },
      provider: "firebase",
    };
  } catch {
    return null;
  }
}

export async function requireSessionUser(): Promise<
  { user: SessionUser; errorResponse: null } | { user: null; errorResponse: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, errorResponse: null };
}
