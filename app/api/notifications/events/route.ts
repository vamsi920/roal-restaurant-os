import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuthContext,
  resolveOrganizationId,
} from "@/lib/auth/context-server";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import type { NotificationEventType } from "@/lib/notifications/types";
import { NOTIFICATION_EVENT_TYPES } from "@/lib/notifications/types";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({
  event_type: z.custom<NotificationEventType>(
    (val) =>
      typeof val === "string" &&
      (NOTIFICATION_EVENT_TYPES as readonly string[]).includes(val)
  ),
  restaurant_id: z.string().uuid().optional(),
  restaurant_name: z.string().optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  payload: z.record(z.string(), z.unknown()).optional(),
  idempotency_key: z.string().min(1).max(200).optional(),
});

export async function POST(req: Request) {
  const auth = await requireAuthContext();
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const orgInput = url.searchParams.get("organization_id");
  const resolved = resolveOrganizationId(auth.context, orgInput);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 }
    );
  }

  const body = parsed.data;

  if (body.restaurant_id) {
    const supabase = await createServerSupabase();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("organization_id")
      .eq("id", body.restaurant_id)
      .maybeSingle();

    if (!restaurant || restaurant.organization_id !== resolved.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const supabase = await createServerSupabase();
  await dispatchNotification(supabase, {
    organizationId: resolved.organizationId,
    restaurantId: body.restaurant_id ?? null,
    restaurantName: body.restaurant_name ?? null,
    eventType: body.event_type,
    title: body.title,
    body: body.body,
    payload: body.payload,
    idempotencyKey: body.idempotency_key,
  });

  return NextResponse.json({ ok: true });
}
