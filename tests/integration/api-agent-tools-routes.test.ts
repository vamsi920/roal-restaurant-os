import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb, type Db } from "@/lib/db";
import { resetMemoryStore } from "@/lib/db/store";
import { mintAgentToolToken } from "@/lib/agent-tools/token";
import { flushAgentToolMetering } from "@/lib/agent-tools/server/record-usage";
import * as getMenuRoute from "@/app/api/agent-tools/get-menu/route";
import * as getRestaurantInfoRoute from "@/app/api/agent-tools/get-restaurant-info/route";
import * as syncDraftOrderRoute from "@/app/api/agent-tools/sync-draft-order/route";
import * as finalizeOrderRoute from "@/app/api/agent-tools/finalize-order/route";
import * as getOrderStatusRoute from "@/app/api/agent-tools/get-order-status/route";
import * as getCallerHistoryRoute from "@/app/api/agent-tools/get-caller-history/route";
import * as submitReservationRoute from "@/app/api/agent-tools/submit-reservation-request/route";

const SECRET = "integration-signing-secret-32-chars!!";
const ORG_ID = "0a0a0a0a-0000-4000-8000-00000000000a";
const RESTAURANT_ID = "1b1b1b1b-1111-4111-8111-11111111111b";
const OTHER_RESTAURANT_ID = "2c2c2c2c-2222-4222-8222-22222222222c";
const AGENT_ID = "agent_integration_test";
const SESSION_ID = "conv_agent_tools_integration_1";
const BASE = "http://localhost:3020/api/agent-tools";

let db: Db;
let token: string;

function req(
  path: string,
  init: { method?: string; body?: unknown; auth?: string | null; headers?: Record<string, string> } = {}
): Request {
  const headers: Record<string, string> = { ...init.headers };
  if (init.auth !== null) headers.Authorization = init.auth ?? `Bearer ${token}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  return new Request(`${BASE}/${path}`, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers,
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose JSON assertions in tests
async function json(res: Response): Promise<Record<string, any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await res.json()) as Record<string, any>;
}

async function seedRestaurant(): Promise<{ burgerId: string; friesId: string }> {
  await db.from("organizations").insert({ id: ORG_ID, name: "Integration Org", slug: "integration-org" });
  await db.from("restaurants").insert({ id: RESTAURANT_ID, organization_id: ORG_ID, name: "Egg Mania" });
  await db
    .from("restaurant_profiles")
    .update({
      elevenlabs_agent_id: AGENT_ID,
      allows_pickup: true,
      allows_delivery: false,
      phone: "+14157830100",
      city: "Austin",
      region: "TX",
      prep_time_minutes: 15,
    })
    .eq("restaurant_id", RESTAURANT_ID);

  const merged = await db.rpc("merge_menu", {
    p_restaurant_id: RESTAURANT_ID,
    p_menu: {
      categories: [
        {
          name: "Mains",
          items: [
            {
              name: "Classic Burger",
              price: 12.5,
              modifiers: [{ group_name: "Add-ons", modifier_name: "Extra Cheese", extra_price: 1 }],
            },
            { name: "Fries", price: 4 },
          ],
        },
      ],
    },
  });
  expect(merged.error).toBeNull();

  const { data: items } = await db.from("items").select("id, name");
  const byName = new Map((items as Array<{ id: string; name: string }>).map((i) => [i.name, i.id]));
  return { burgerId: byName.get("Classic Burger")!, friesId: byName.get("Fries")! };
}

beforeEach(() => {
  // Noon in America/Chicago on a weekday: inside the default 11:00–21:00 weekly hours.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T17:00:00.000Z"));
  process.env.AGENT_TOOL_SIGNING_SECRET = SECRET;
  delete process.env.AGENT_TOOL_SECRET;
  delete process.env.STRIPE_SECRET_KEY;
  resetMemoryStore({});
  db = getDb();
  token = mintAgentToolToken({ restaurantId: RESTAURANT_ID, agentId: AGENT_ID });
});

afterEach(async () => {
  await flushAgentToolMetering();
  vi.useRealTimers();
  delete process.env.AGENT_TOOL_SIGNING_SECRET;
  delete process.env.AGENT_TOOL_SECRET;
});

describe("agent tool routes: auth + transport", () => {
  it("returns the edge-compatible 401 body without a bearer", async () => {
    await seedRestaurant();
    for (const [route, path, body] of [
      [getMenuRoute, `get-menu?restaurant_id=${RESTAURANT_ID}`, undefined],
      [syncDraftOrderRoute, "sync-draft-order", { session_id: SESSION_ID, status: "draft", items: [] }],
      [finalizeOrderRoute, "finalize-order", { session_id: SESSION_ID, customer_name: "Priya Shah", customer_phone: "+14157830199" }],
      [getOrderStatusRoute, "get-order-status", { session_id: SESSION_ID }],
    ] as const) {
      const res = await (body ? route.POST : route.GET)(req(path, { body, auth: null }));
      expect(res.status).toBe(401);
      expect(await json(res)).toEqual({ error: "Unauthorized", code: "missing_bearer" });
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    }
  });

  it("rejects a bad signature and a token for another restaurant", async () => {
    await seedRestaurant();
    const bad = await getMenuRoute.GET(req("get-menu", { auth: `Bearer ${token.slice(0, -2)}xx` }));
    expect(bad.status).toBe(401);
    expect((await json(bad)).code).toBe("invalid_signature");

    const mismatch = await getMenuRoute.GET(
      req(`get-menu?restaurant_id=${OTHER_RESTAURANT_ID}`)
    );
    expect(mismatch.status).toBe(400);
    expect((await json(mismatch)).code).toBe("restaurant_id_mismatch");
  });

  it("rejects a signed token whose agent id does not match the linked agent", async () => {
    await seedRestaurant();
    const otherAgent = mintAgentToolToken({ restaurantId: RESTAURANT_ID, agentId: "agent_someone_else" });
    const res = await getMenuRoute.GET(req("get-menu", { auth: `Bearer ${otherAgent}` }));
    expect(res.status).toBe(403);
    expect(await json(res)).toEqual({
      error: "Agent not authorized for this restaurant",
      code: "agent_restaurant_mismatch",
    });
  });

  it("accepts the legacy AGENT_TOOL_SECRET with an explicit restaurant id", async () => {
    await seedRestaurant();
    process.env.AGENT_TOOL_SECRET = "legacy-global-secret";
    const res = await getMenuRoute.GET(
      req("get-menu", {
        auth: "Bearer legacy-global-secret",
        headers: { "x-roal-restaurant-id": RESTAURANT_ID },
      })
    );
    expect(res.status).toBe(200);
  });

  it("answers OPTIONS with ok and 405 JSON for unsupported methods", async () => {
    const pre = syncDraftOrderRoute.OPTIONS();
    expect(pre.status).toBe(200);
    expect(await pre.text()).toBe("ok");
    expect(pre.headers.get("Access-Control-Allow-Headers")).toContain("x-roal-idempotency-key");

    const res = await syncDraftOrderRoute.GET(req("sync-draft-order"));
    expect(res.status).toBe(405);
    expect(await json(res)).toEqual({
      error: "method_not_allowed",
      code: "method_not_allowed",
      message: "Use POST.",
    });

    const bad = await syncDraftOrderRoute.POST(req("sync-draft-order", { body: "{not json" }));
    expect(bad.status).toBe(400);
    expect((await json(bad)).code).toBe("invalid_json");
  });
});

describe("agent tool routes: order flow against the in-memory db", () => {
  it("get-menu → sync-draft-order → finalize-order → get-order-status → get-caller-history", async () => {
    const { burgerId, friesId } = await seedRestaurant();

    // get_menu_items
    const menuRes = await getMenuRoute.GET(
      req(`get-menu?restaurant_id=${RESTAURANT_ID}&restaurant_name=Egg%20Mania`)
    );
    expect(menuRes.status).toBe(200);
    const menu = await json(menuRes);
    expect(Object.keys(menu).sort()).toEqual(
      ["categories", "operations", "restaurant", "restaurant_name_hint", "service_modes"].sort()
    );
    expect(menu.restaurant).toMatchObject({ id: RESTAURANT_ID, name: "Egg Mania" });
    expect(menu.restaurant_name_hint).toBe("Egg Mania");
    expect(menu.service_modes).toEqual({ pickup: true, delivery: false });
    expect(menu.operations).toMatchObject({ ordering_allowed: true, status: "open", timezone: "America/Chicago" });
    expect(menu.operations.weekly_hours).toHaveLength(7);
    expect(menu.categories).toHaveLength(1);
    expect(menu.categories[0].name).toBe("Mains");
    const burger = menu.categories[0].items.find((i: { id: string }) => i.id === burgerId);
    expect(burger).toMatchObject({ name: "Classic Burger", price: 12.5, is_available: true });
    expect(burger.modifiers[0]).toMatchObject({ modifier_name: "Extra Cheese", group_name: "Add-ons" });

    // sync_draft_order
    const syncBody = {
      session_id: SESSION_ID,
      status: "draft",
      items: [
        { item_id: burgerId, quantity: 2, customizations: ["Extra Cheese"] },
        { name: "Fries", quantity: 1 },
      ],
    };
    const syncRes = await syncDraftOrderRoute.POST(
      req("sync-draft-order", { body: syncBody, headers: { "x-roal-idempotency-key": "sync-1" } })
    );
    expect(syncRes.status).toBe(200);
    const sync = await json(syncRes);
    expect(Object.keys(sync).sort()).toEqual(["draft_order", "ok"]);
    expect(sync.ok).toBe(true);
    expect(sync.draft_order).toMatchObject({
      restaurant_id: RESTAURANT_ID,
      session_id: SESSION_ID,
      status: "draft",
    });
    expect(sync.draft_order.items).toHaveLength(2);
    expect(sync.draft_order.items.map((l: { item_id: string }) => l.item_id).sort()).toEqual(
      [burgerId, friesId].sort()
    );

    // Idempotent replay returns the stored body with the replay header.
    const replay = await syncDraftOrderRoute.POST(
      req("sync-draft-order", { body: syncBody, headers: { "x-roal-idempotency-key": "sync-1" } })
    );
    expect(replay.status).toBe(200);
    expect(replay.headers.get("x-roal-idempotent-replay")).toBe("true");
    expect(await json(replay)).toEqual(sync);

    // Menu validation failure keeps the 422 contract.
    const stale = await syncDraftOrderRoute.POST(
      req("sync-draft-order", {
        body: { session_id: SESSION_ID, status: "draft", items: [{ name: "Lobster Thermidor", quantity: 1 }] },
      })
    );
    expect(stale.status).toBe(422);
    expect((await json(stale)).code).toBe("order_validation_failed");

    // finalize_order (items come from the synced draft)
    const finRes = await finalizeOrderRoute.POST(
      req("finalize-order", {
        body: { session_id: SESSION_ID, customer_name: "Priya Shah", customer_phone: "+1 (415) 783-0199" },
      })
    );
    expect(finRes.status).toBe(200);
    const fin = await json(finRes);
    expect(Object.keys(fin).sort()).toEqual(["draft_order", "ok"]);
    expect(fin.draft_order).toMatchObject({
      session_id: SESSION_ID,
      status: "new",
      customer_name: "Priya Shah",
      fulfillment_type: "pickup",
    });

    const { data: receipt } = await db
      .from("phone_order_receipts")
      .select("*")
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("session_id", SESSION_ID)
      .maybeSingle();
    expect(receipt?.items).toHaveLength(2);
    const { data: callEvent } = await db
      .from("agent_call_events")
      .select("*")
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("session_id", SESSION_ID)
      .maybeSingle();
    expect(callEvent).toMatchObject({ status: "ended", outcome: "order_completed" });

    // get_order_status
    const statusRes = await getOrderStatusRoute.POST(req("get-order-status", { body: { session_id: SESSION_ID } }));
    expect(statusRes.status).toBe(200);
    const status = await json(statusRes);
    expect(status.ok).toBe(true);
    expect(Object.keys(status.order).sort()).toEqual(
      [
        "created_at",
        "customer_name",
        "customer_phone",
        "found",
        "item_count",
        "message",
        "session_id",
        "status",
        "status_label",
        "status_timeline",
        "updated_at",
      ].sort()
    );
    expect(status.order).toMatchObject({
      found: true,
      status: "new",
      status_label: "received by the kitchen",
      message: "That order has been received by the kitchen.",
      item_count: 3,
    });

    // Phone lookup works with a differently formatted number.
    const byPhone = await json(
      await getOrderStatusRoute.POST(req("get-order-status", { body: { customer_phone: "415-783-0199" } }))
    );
    expect(byPhone.order.session_id).toBe(SESSION_ID);

    // get_caller_history
    const historyRes = await getCallerHistoryRoute.POST(
      req("get-caller-history", { body: { customer_phone: "+14157830199" } })
    );
    expect(historyRes.status).toBe(200);
    const history = await json(historyRes);
    expect(history.caller).toMatchObject({
      found: true,
      customer_name: "Priya Shah",
      completed_order_count: 1,
    });
    expect(history.caller.last_order_items).toEqual(expect.arrayContaining(["Classic Burger", "Fries"]));

    // Usage metering landed in usage_events.
    await flushAgentToolMetering();
    const { data: usage } = await db.from("usage_events").select("event_type, metadata").eq("organization_id", ORG_ID);
    const types = (usage as Array<{ event_type: string }>).map((u) => u.event_type);
    expect(types).toContain("tool_call");
    expect(types).toContain("voice_order");
    expect(types).toContain("order_completed");
  });

  it("refuses to sync while the restaurant is closed", async () => {
    await seedRestaurant();
    await db.from("restaurant_profiles").update({ temporarily_closed: true }).eq("restaurant_id", RESTAURANT_ID);
    const res = await syncDraftOrderRoute.POST(
      req("sync-draft-order", { body: { session_id: SESSION_ID, status: "draft", items: [] } })
    );
    expect(res.status).toBe(403);
    const body = await json(res);
    expect(body.code).toBe("restaurant_closed");
    expect(body.operations).toMatchObject({ ordering_allowed: false, status: "temporarily_closed" });
  });

  it("get-restaurant-info and submit-reservation-request return their contract shapes", async () => {
    await seedRestaurant();
    const infoRes = await getRestaurantInfoRoute.POST(req("get-restaurant-info", { body: {} }));
    expect(infoRes.status).toBe(200);
    const info = await json(infoRes);
    expect(Object.keys(info).sort()).toEqual(
      ["knowledge_entries", "knowledge_status_message", "ok", "operations", "restaurant"].sort()
    );
    expect(info.restaurant).toMatchObject({
      id: RESTAURANT_ID,
      name: "Egg Mania",
      phone: "+14157830100",
      prep_time_minutes: 15,
      service_modes: { pickup: true, delivery: false },
    });
    expect(info.restaurant.address.display).toBe("Austin, TX, US");

    const resvRes = await submitReservationRoute.POST(
      req("submit-reservation-request", {
        body: {
          session_id: SESSION_ID,
          customer_name: "Priya Shah",
          customer_phone: "+14157830199",
          party_size: 4,
          requested_date: "Friday",
          requested_time: "7 PM",
        },
      })
    );
    expect(resvRes.status).toBe(200);
    const resv = await json(resvRes);
    expect(resv.reservation_request).toMatchObject({
      restaurant_id: RESTAURANT_ID,
      session_id: SESSION_ID,
      conversation_id: SESSION_ID,
      party_size: 4,
      status: "requested",
    });
    expect(resv.reservation_request.message).toContain("not a confirmed reservation");

    const placeholder = await submitReservationRoute.POST(
      req("submit-reservation-request", {
        body: {
          customer_name: "Priya Shah",
          customer_phone: "555-555-5555",
          party_size: 2,
          requested_date: "Friday",
          requested_time: "7 PM",
        },
      })
    );
    expect(placeholder.status).toBe(400);
    expect((await json(placeholder)).code).toBe("invalid_customer_phone");
  });
});
