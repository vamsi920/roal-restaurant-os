import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next";
import { getPublicEnv } from "@/lib/env.public";

/**
 * Handles every Supabase PKCE redirect: email confirmation, password recovery, and
 * OAuth (Google). Exchanges `code` for a session cookie, then sends the user to a
 * same-origin `next` path. Errors bounce back to the page the user started from.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  function failTo(message: string) {
    // Recovery links return to the reset page so the user can request a fresh one.
    const back = next.startsWith("/reset-password") ? "/reset-password" : "/login";
    const url = new URL(back, origin);
    url.searchParams.set("error", message);
    if (back === "/login" && next !== "/dashboard") {
      url.searchParams.set("next", next);
    }
    return NextResponse.redirect(url);
  }

  if (!code) {
    // OAuth providers report failures as `error` / `error_description` instead of a code.
    const providerError =
      searchParams.get("error_description") ?? searchParams.get("error");
    return failTo(providerError?.trim() || "Sign-in link expired or invalid. Try again.");
  }

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } =
    getPublicEnv();

  let response = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.redirect(new URL(next, origin));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return failTo(error.message);
  }

  return response;
}
