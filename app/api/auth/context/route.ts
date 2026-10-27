import { NextResponse } from "next/server";
import {
  getAuthContext,
  serializeAuthContext,
} from "@/lib/auth/context-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Signed-in user + memberships for client components (session cookie, no browser DB client). */
export async function GET() {
  const context = await getAuthContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(serializeAuthContext(context), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
