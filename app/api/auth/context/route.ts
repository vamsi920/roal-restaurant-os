import { NextResponse } from "next/server";
import {
  getAuthContext,
  serializeAuthContext,
} from "@/lib/auth/context-server";

export const runtime = "nodejs";

export async function GET() {
  const context = await getAuthContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(serializeAuthContext(context));
}
