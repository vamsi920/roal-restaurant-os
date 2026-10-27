import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryDb } from "@/lib/db";
import { resetMemoryStore } from "@/lib/db/store";

describe("document db layer (Postgres parity)", () => {
  beforeEach(() => resetMemoryStore());

  it("applies defaults and runs the old insert triggers", async () => {
    const db = createMemoryDb();
    const org = await db.from("organizations").insert({ name: "Acme", slug: "acme" }).select("*").single();
    expect(org.error).toBeNull();
    expect(org.data.id).toMatch(/[0-9a-f-]{36}/);
    expect(org.data.billing_plan).toBe("starter");
    const onb = await db.from("organization_onboarding").select("*").eq("organization_id", org.data.id).maybeSingle();
    expect(onb.data?.steps).toEqual({ account: { status: "in_progress" } });

    const r = await db.from("restaurants").insert({ name: "Joe's", organization_id: org.data.id }).select("id").single();
    const profile = await db.from("restaurant_profiles").select("*").eq("restaurant_id", r.data.id).maybeSingle();
    expect(profile.data?.timezone).toBe("America/Chicago");
    expect(profile.data?.allows_pickup).toBe(true);
    const hours = await db.from("restaurant_weekly_hours").select("*", { count: "exact" }).eq("restaurant_id", r.data.id);
    expect(hours.count).toBe(7);
    const ro = await db.from("restaurant_onboarding").select("current_step").eq("restaurant_id", r.data.id).single();
    expect(ro.data.current_step).toBe("restaurant_profile");
  });

  it("enforces unique keys and supports upsert onConflict", async () => {
    const db = createMemoryDb();
    await db.from("memberships").insert({ organization_id: "o1", user_id: "u1", role: "owner" });
    const dup = await db.from("memberships").insert({ organization_id: "o1", user_id: "u1" });
    expect(dup.error?.code).toBe("23505");

    await db.from("restaurant_weekly_hours").upsert(
      { restaurant_id: "r1", day_of_week: 2, is_closed: true, open_time: null, close_time: null },
      { onConflict: "restaurant_id,day_of_week" }
    );
    await db.from("restaurant_weekly_hours").upsert(
      { restaurant_id: "r1", day_of_week: 2, is_closed: false, open_time: "10:00", close_time: "20:00" },
      { onConflict: "restaurant_id,day_of_week" }
    );
    const rows = await db.from("restaurant_weekly_hours").select("*").eq("restaurant_id", "r1");
    expect(rows.data).toHaveLength(1);
    expect(rows.data[0].open_time).toBe("10:00");
  });

  it("filters, orders, limits, counts, and embeds", async () => {
    const db = createMemoryDb();
    for (const [i, s] of ["new", "ready", "new", "completed"].entries()) {
      await db.from("draft_orders").insert({ restaurant_id: "r1", session_id: `s${i}`, status: s, total: i * 10, created_at: `2026-10-0${i + 1}T00:00:00Z` });
    }
    const res = await db
      .from("draft_orders")
      .select("session_id, total", { count: "exact" })
      .eq("restaurant_id", "r1")
      .in("status", ["new", "ready"])
      .gte("total", 10)
      .order("created_at", { ascending: false })
      .limit(1);
    expect(res.count).toBe(2);
    expect(res.data).toEqual([{ session_id: "s2", total: 20 }]);
    const notNew = await db.from("draft_orders").select("*").eq("restaurant_id", "r1").not("status", "eq", "new");
    expect(notNew.data).toHaveLength(2);

    await db.from("organizations").insert({ id: "o9", name: "Nine" });
    await db.from("memberships").insert({ organization_id: "o9", user_id: "u9", role: "owner" });
    const m = await db
      .from("memberships")
      .select(`id, role, organization:organizations ( id, name )`)
      .eq("user_id", "u9");
    expect(m.data[0].organization).toEqual({ id: "o9", name: "Nine" });
  });

  it("merge_menu and clear_restaurant_menu match the old RPCs", async () => {
    const db = createMemoryDb();
    await db.from("restaurants").insert({ id: "r1", name: "R", organization_id: "o1" });
    const res = await db.rpc("merge_menu", {
      p_restaurant_id: "r1",
      p_menu: {
        categories: [
          { name: "Pizza", items: [{ name: "Margherita", price: 14, modifiers: [{ modifier_name: "Extra cheese", extra_price: 2 }] }] },
        ],
      },
    });
    expect(res.data).toEqual({ ok: true, categories: 1, items: 1, modifiers: 1 });
    // Re-merge updates in place, replaces modifiers.
    await db.rpc("merge_menu", { p_restaurant_id: "r1", p_menu: { categories: [{ name: "Pizza", items: [{ name: "Margherita", price: 15 }] }] } });
    const items = await db.from("items").select("*");
    expect(items.data).toHaveLength(1);
    expect(items.data[0].price).toBe(15);
    expect((await db.from("modifiers").select("*")).data).toHaveLength(0);

    const cleared = await db.rpc("clear_restaurant_menu", { p_restaurant_id: "r1" });
    expect(cleared.data).toBe(1);
    expect((await db.from("items").select("*")).data).toHaveLength(0);
  });

  it("single() errors on zero rows, maybeSingle() returns null", async () => {
    const db = createMemoryDb();
    const one = await db.from("restaurants").select("*").eq("id", "nope").single();
    expect(one.error?.code).toBe("PGRST116");
    const maybe = await db.from("restaurants").select("*").eq("id", "nope").maybeSingle();
    expect(maybe).toMatchObject({ data: null, error: null });
  });

  it("cascades deletes from restaurants to menu rows", async () => {
    const db = createMemoryDb();
    await db.from("restaurants").insert({ id: "r1", name: "R", organization_id: "o1" });
    await db.rpc("merge_menu", { p_restaurant_id: "r1", p_menu: { categories: [{ name: "A", items: [{ name: "x", price: 1 }] }] } });
    await db.from("restaurants").delete().eq("id", "r1");
    expect((await db.from("items").select("*")).data).toHaveLength(0);
    expect((await db.from("restaurant_profiles").select("*")).data).toHaveLength(0);
  });
});

describe("db layer safety", () => {
  beforeEach(() => resetMemoryStore());
  it("undefined filter values match nothing (no accidental widening)", async () => {
    const db = createMemoryDb();
    await db.from("restaurants").insert({ id: "r1", name: "A", organization_id: "o1" });
    await db.from("restaurants").insert({ id: "r2", name: "B" });
    const res = await db.from("restaurants").select("*").eq("organization_id", undefined);
    expect(res.data).toEqual([]);
  });
  it("unknown operators fail loudly", async () => {
    const db = createMemoryDb();
    await db.from("restaurants").insert({ id: "r1", name: "A", organization_id: "o1" });
    const res = await db.from("restaurants").select("*").filter("organization_id", "bogus", "o1");
    expect(res.error?.message).toMatch(/Unsupported filter operator/);
  });
});

import { assertDurableStoreAllowed } from "@/lib/db";

describe("production safety", () => {
  it("refuses the in-memory store in production without credentials", () => {
    expect(() => assertDurableStoreAllowed({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toThrow(/Firestore is not configured/);
  });
  it("allows it with credentials, in dev, during build, or when demo is explicit", () => {
    const base = { NODE_ENV: "production" } as Record<string, string>;
    expect(() => assertDurableStoreAllowed({ ...base, FIREBASE_SERVICE_ACCOUNT: "{}" } as NodeJS.ProcessEnv)).not.toThrow();
    expect(() => assertDurableStoreAllowed({ NODE_ENV: "development" } as NodeJS.ProcessEnv)).not.toThrow();
    expect(() => assertDurableStoreAllowed({ ...base, NEXT_PHASE: "phase-production-build" } as NodeJS.ProcessEnv)).not.toThrow();
    expect(() => assertDurableStoreAllowed({ ...base, ROAL_DEMO_MODE: "1" } as NodeJS.ProcessEnv)).not.toThrow();
  });
});
