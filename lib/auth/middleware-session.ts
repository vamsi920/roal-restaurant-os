import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, buildGuestLoginRedirect } from "@/lib/auth/auth-routes";
import { safeNextPath } from "@/lib/auth/safe-next";
import { DEMO_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/auth/session-user";

const AUTH_PATHS = new Set<string>([AUTH_ROUTES.login, AUTH_ROUTES.signup]);

function isProtectedApi(pathname: string): boolean {
  return pathname.startsWith("/api/restaurants") || pathname.startsWith("/api/scanner/");
}

/**
 * Edge middleware: cheap cookie-presence routing only. The session cookie is fully
 * verified (Firebase Admin) in server components and route handlers.
 */
export function routeBySession(request: NextRequest): NextResponse {
  const hasSession = Boolean(
    request.cookies.get(SESSION_COOKIE)?.value || request.cookies.get(DEMO_SESSION_COOKIE)?.value
  );
  const { pathname } = request.nextUrl;

  if (isProtectedApi(pathname) && !hasSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (pathname.startsWith("/dashboard") && !hasSession) {
    return NextResponse.redirect(new URL(buildGuestLoginRedirect(pathname, request.nextUrl.search), request.url));
  }
  if (AUTH_PATHS.has(pathname) && hasSession && request.nextUrl.searchParams.get("stale") !== "1") {
    const dest = request.nextUrl.clone();
    dest.pathname = safeNextPath(request.nextUrl.searchParams.get("next"));
    dest.search = "";
    return NextResponse.redirect(dest);
  }
  return NextResponse.next({ request });
}
