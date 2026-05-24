import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, buildGuestLoginRedirect } from "@/lib/auth/auth-routes";
import { safeNextPath } from "@/lib/auth/safe-next";

const AUTH_PATHS = new Set<string>([AUTH_ROUTES.login, AUTH_ROUTES.signup]);

function isProtectedApi(pathname: string): boolean {
  return (
    pathname.startsWith("/api/restaurants") ||
    pathname.startsWith("/api/scanner/")
  );
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isProtectedApi(pathname) && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (pathname.startsWith("/dashboard") && !user) {
    return NextResponse.redirect(
      new URL(buildGuestLoginRedirect(pathname, request.nextUrl.search), request.url)
    );
  }

  if (AUTH_PATHS.has(pathname) && user) {
    const dest = request.nextUrl.clone();
    dest.pathname = safeNextPath(request.nextUrl.searchParams.get("next"));
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  return response;
}
