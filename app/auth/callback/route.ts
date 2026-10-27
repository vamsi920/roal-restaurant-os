import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next";

/**
 * Legacy redirect target from the Supabase era (email confirmations, OAuth, recovery).
 * Firebase signs in on the page itself, so this only forwards old links to a same-origin
 * `next` path and never touches the session.
 */
export function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  return NextResponse.redirect(new URL(next, origin));
}
