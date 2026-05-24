import { NextResponse } from "next/server";
import {
  requireAuthContext,
  resolveOrganizationId,
} from "@/lib/auth/context-server";
import { notifyStuckOrdersForOrganization } from "@/lib/notifications/stuck-orders";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAuthContext();
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const orgInput = url.searchParams.get("organization_id");
  const resolved = resolveOrganizationId(auth.context, orgInput);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 403 });
  }

  const supabase = await createServerSupabase();
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("organization_id", resolved.organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const names = new Map(
    (restaurants ?? []).map((r) => [r.id as string, r.name as string])
  );

  const notified = await notifyStuckOrdersForOrganization(supabase, {
    organizationId: resolved.organizationId,
    restaurantNames: names,
  });

  return NextResponse.json({ ok: true, notified });
}
