import { NextResponse, type NextRequest } from "next/server";
import { DEMO_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/auth/session-user";

export const runtime = "nodejs";

async function signOutAndRedirect(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const { isFirebaseAuthConfigured } = await import("@/lib/auth/demo-mode");
      if (isFirebaseAuthConfigured()) {
        const { adminAuth } = await import("@/lib/firebase/admin");
        const decoded = await adminAuth().verifySessionCookie(token, false);
        await adminAuth().revokeRefreshTokens(decoded.sub);
      }
    } catch {
      // Expired or invalid cookie: just clear it.
    }
  }
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(DEMO_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}

export async function GET(request: NextRequest) {
  return signOutAndRedirect(request);
}
