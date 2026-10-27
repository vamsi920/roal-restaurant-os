import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryDb } from "@/lib/db";
import { resetMemoryStore, dumpMemoryStore } from "@/lib/db/store";
import { isAnalyticsExcludedSession } from "@/lib/analytics/exclude-test-sessions";
import { DEMO_ORG_SLUG, DEMO_SEED_VERSION, DEMO_SESSION_PREFIX, refreshLiveDemoRows, seedDemoWorkspace } from "@/lib/demo/seed-demo-workspace";
import { TRIAL_VOICE_OPTIONS } from "@/lib/trial/voices";
import { loadLiveOrdersPayload } from "@/lib/live/load-live-orders";

const NOW = Date.parse("2026-10-27T18:30:00.000Z");

describe("demo workspace seed", () => {
  beforeEach(() => resetMemoryStore());

  it("seeds a complete, clearly fictional restaurant for the demo owner", async () => {
    const db = createMemoryDb();
    const result = await seedDemoWorkspace(db, { userId: "demo-owner", now: NOW });
    expect(result.seeded).toBe(true);

    const org = await db.from("organizations").select("*").eq("slug", DEMO_ORG_SLUG).single();
    expect(org.data.name).toBe("Maria's Trattoria");
    const members = await db.from("memberships").select("*").eq("organization_id", result.organizationId);
    expect(members.data).toEqual([expect.objectContaining({ user_id: "demo-owner", role: "owner" })]);
    const profileRow = await db.from("profiles").select("*").eq("id", "demo-owner").single();
    expect(profileRow.data.display_name).toBe("Maria Rossi");

    const profile = await db.from("restaurant_profiles").select("*").eq("restaurant_id", result.restaurantId).single();
    expect(profile.data).toMatchObject({
      city: "Austin",
      region: "TX",
      timezone: "America/Chicago",
      allows_pickup: true,
      allows_delivery: true,
      agent_display_name: "Sofia",
    });
    expect(TRIAL_VOICE_OPTIONS.map((v) => v.id)).toContain(profile.data.agent_voice_id);

    const cats = await db.from("categories").select("id").eq("restaurant_id", result.restaurantId);
    const items = await db.from("items").select("id").in("category_id", cats.data.map((c: { id: string }) => c.id));
    expect(items.data.length).toBeGreaterThanOrEqual(24);

    const calls = (await db.from("agent_call_events").select("*").eq("restaurant_id", result.restaurantId)).data as Array<Record<string, unknown>>;
    expect(calls.length).toBeGreaterThanOrEqual(38);
    expect(calls.filter((c) => c.status === "active")).toHaveLength(1);
    const outcomes = new Set(calls.map((c) => c.outcome));
    for (const o of ["order_completed", "no_order", "abandoned", "in_progress"]) expect(outcomes.has(o)).toBe(true);
    expect(calls.some((c) => (c.transcript_metadata as Record<string, unknown>).voicemail_detected === true)).toBe(true);
    expect(calls.some((c) => (c.transcript_metadata as Record<string, unknown>).handoff_requested === true)).toBe(true);
    const completed = calls.find((c) => c.outcome === "order_completed")!;
    const meta = completed.transcript_metadata as Record<string, unknown>;
    expect(Array.isArray(meta.transcript)).toBe(true);
    expect(typeof meta.transcript_summary).toBe("string");
    expect(typeof meta.call_duration_secs).toBe("number");
    // Oldest call within the 14-day window.
    const oldest = Math.min(...calls.map((c) => Date.parse(String(c.started_at))));
    expect(NOW - oldest).toBeLessThanOrEqual(14 * 24 * 3600 * 1000);

    // Analytics/billing test-call exclusion must not hide seeded rows.
    for (const c of calls) {
      expect(String(c.session_id).startsWith(DEMO_SESSION_PREFIX)).toBe(true);
      expect(isAnalyticsExcludedSession(String(c.session_id))).toBe(false);
    }

    const drafts = (await db.from("draft_orders").select("*").eq("restaurant_id", result.restaurantId)).data as Array<Record<string, unknown>>;
    const statuses = drafts.map((d) => d.status);
    for (const s of ["new", "in_progress", "ready", "completed", "draft"]) expect(statuses).toContain(s);
    const receipts = (await db.from("phone_order_receipts").select("*").eq("restaurant_id", result.restaurantId)).data;
    expect(receipts.length).toBe(drafts.filter((d) => d.status !== "draft").length);

    expect((await db.from("restaurant_reservation_requests").select("id").eq("restaurant_id", result.restaurantId)).data).toHaveLength(3);
    expect((await db.from("restaurant_knowledge_suggestions").select("id").eq("restaurant_id", result.restaurantId).eq("status", "pending")).data).toHaveLength(4);
    expect((await db.from("restaurant_upsell_rules").select("id").eq("restaurant_id", result.restaurantId)).data).toHaveLength(2);
    expect((await db.from("restaurant_knowledge_entries").select("id").eq("restaurant_id", result.restaurantId)).data.length).toBeGreaterThanOrEqual(5);

    const onboarding = await db.from("restaurant_onboarding").select("*").eq("restaurant_id", result.restaurantId).single();
    expect(onboarding.data.steps.go_live.status).toBe("pending");
    expect(onboarding.data.steps.menu_import.status).toBe("completed");
  });

  it("feeds the Kitchen board: live call strip, 2+ live tickets, call evidence", async () => {
    const db = createMemoryDb();
    const result = await seedDemoWorkspace(db);
    const live = await loadLiveOrdersPayload(db, { restaurantId: result.restaurantId, restaurantName: "Maria's Trattoria" });
    expect(live.error).toBeNull();
    expect(live.activeCalls.length).toBeGreaterThanOrEqual(1);
    const open = live.draftOrders.filter((d) => ["new", "in_progress", "ready"].includes(d.status));
    expect(open.length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(live.callEvidenceBySession).length).toBeGreaterThan(20);
  });

  it("is idempotent: a second sign-in does not duplicate anything", async () => {
    const db = createMemoryDb();
    const first = await seedDemoWorkspace(db, { now: NOW });
    const before = JSON.stringify(dumpMemoryStore());
    const second = await seedDemoWorkspace(db, { now: NOW + 60_000 });
    expect(second).toMatchObject({ seeded: false, organizationId: first.organizationId, restaurantId: first.restaurantId });
    expect(JSON.stringify(dumpMemoryStore())).toBe(before);
  });

  it("re-times the live call and open tickets when they go stale", async () => {
    const db = createMemoryDb();
    const { restaurantId } = await seedDemoWorkspace(db, { now: NOW });
    const later = NOW + 3 * 24 * 3600 * 1000;
    expect(await refreshLiveDemoRows(db, restaurantId, later)).toBe(true);
    const active = await db.from("agent_call_events").select("started_at").eq("restaurant_id", restaurantId).eq("status", "active").single();
    expect(later - Date.parse(active.data.started_at)).toBeLessThan(10 * 60_000);
    const fresh = await db.from("draft_orders").select("updated_at").eq("restaurant_id", restaurantId).eq("status", "new").single();
    expect(later - Date.parse(fresh.data.updated_at)).toBeLessThan(15 * 60_000);
  });

  it("upgrades an older demo workspace in place", async () => {
    const db = createMemoryDb();
    const { organizationId, restaurantId } = await seedDemoWorkspace(db, { now: NOW });
    await db.from("organizations").update({ demo_seed_version: 1 }).eq("id", organizationId);
    await db.from("restaurant_profiles").update({ elevenlabs_last_sync_summary: { tools: [] } }).eq("restaurant_id", restaurantId);
    const again = await seedDemoWorkspace(db, { now: NOW });
    expect(again.seeded).toBe(false);
    const org = await db.from("organizations").select("demo_seed_version").eq("id", organizationId).single();
    expect(org.data.demo_seed_version).toBe(DEMO_SEED_VERSION);
    const profile = await db.from("restaurant_profiles").select("elevenlabs_last_sync_summary").eq("restaurant_id", restaurantId).single();
    expect(profile.data.elevenlabs_last_sync_summary.tools.length).toBe(7);
  });

  it("prunes dangling memberships left by the old Legacy POC auto-claim", async () => {
    const db = createMemoryDb();
    await db.from("memberships").insert({ organization_id: "00000000-0000-4000-8000-000000000001", user_id: "demo-owner", role: "owner" });
    await seedDemoWorkspace(db, { now: NOW });
    const rows = (await db.from("memberships").select("organization_id").eq("user_id", "demo-owner")).data;
    expect(rows).toHaveLength(1);
  });
});
