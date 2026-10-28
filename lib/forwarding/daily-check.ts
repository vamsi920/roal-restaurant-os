import type { Db } from "@/lib/db";
import { detectLiveForwardedCalls } from "@/lib/forwarding/twilio-check";
import { saveForwardingRow, type ForwardingRow } from "@/lib/forwarding/state";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { evaluateRestaurantHours } from "@/lib/restaurant-hours/core";

const DAY_MS = 24 * 60 * 60 * 1000;

/** True when the restaurant was meant to be open on its local "today" (weekly hours, holidays, temp close). */
export async function wasOpenToday(db: Db, restaurantId: string, now: Date): Promise<boolean> {
  const [{ data: profile }, { data: weekly }, { data: exceptions }] = await Promise.all([
    db.from("restaurant_profiles").select("timezone, temporarily_closed, temporarily_closed_reason").eq("restaurant_id", restaurantId).maybeSingle(),
    db.from("restaurant_weekly_hours").select("*").eq("restaurant_id", restaurantId),
    db.from("restaurant_hours_exceptions").select("*").eq("restaurant_id", restaurantId),
  ]);
  if (!profile) return false;
  const evaluation = evaluateRestaurantHours({ profile, weekly: weekly ?? [], exceptions: exceptions ?? [], at: now });
  if (evaluation.status === "temporarily_closed") return false;
  const holiday = (exceptions ?? []).find((e: { exception_date: string }) => e.exception_date === evaluation.local_date);
  if (holiday) return !holiday.is_closed;
  const today = (weekly ?? []).find((w: { day_of_week: number }) => w.day_of_week === evaluation.local_day_of_week);
  // No hours set means we can't tell; don't alarm the owner.
  return Boolean(today && !today.is_closed);
}

export type DailyCheckResult = { checked: number; seen: number; quiet: number; alerted: number };

/**
 * Daily: for every location whose forwarding is on, look for real calls reaching its ROAL line
 * in the last 24 hours. None on a day it was open means forwarding was probably switched off:
 * mark it quiet (the dashboard to-do comes back) and notify the owner once.
 */
export async function runForwardingDailyCheck(
  db: Db,
  deps: { now?: Date; detect?: typeof detectLiveForwardedCalls; notify?: typeof dispatchNotification } = {}
): Promise<DailyCheckResult> {
  const now = deps.now ?? new Date();
  const detect = deps.detect ?? detectLiveForwardedCalls;
  const notify = deps.notify ?? dispatchNotification;
  const { data } = await db.from("restaurant_call_forwarding").select("*").in("status", ["on", "quiet"]);
  const rows = (data ?? []) as ForwardingRow[];
  const result: DailyCheckResult = { checked: 0, seen: 0, quiet: 0, alerted: 0 };

  for (const row of rows) {
    result.checked += 1;
    try {
      const seen = await detect(db, row.restaurant_id, new Date(now.getTime() - DAY_MS), { now });
      if (seen) {
        result.seen += 1;
        continue;
      }
      if (!(await wasOpenToday(db, row.restaurant_id, now))) continue;
      result.quiet += 1;
      if (row.status === "quiet") continue; // Already told them.
      await saveForwardingRow(db, row.restaurant_id, { status: "quiet", quiet_since: now.toISOString() });

      const { data: restaurant } = await db
        .from("restaurants")
        .select("id, name, organization_id")
        .eq("id", row.restaurant_id)
        .maybeSingle<{ id: string; name: string; organization_id: string }>();
      if (!restaurant) continue;
      const sent = await notify(db, {
        organizationId: restaurant.organization_id,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        eventType: "forwarding_quiet",
        title: `No calls reached your ROAL host today at ${restaurant.name}`,
        body: "Call forwarding may have been switched off. Open your ROAL dashboard and tap Test my forwarding to check.",
        idempotencyKey: `forwarding_quiet:${restaurant.id}:${now.toISOString().slice(0, 10)}`,
      });
      if (sent) result.alerted += 1;
    } catch (e) {
      console.error("[forwarding] daily check failed", row.restaurant_id, e instanceof Error ? e.message : e);
    }
  }
  return result;
}
