import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryDb, type Db } from "@/lib/db";

const env = vi.hoisted(() => ({ signing: "sign_secret" as string | undefined }));
vi.mock("@/lib/env.server", () => ({
  getServerEnv: () => ({
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x",
    STRIPE_SECRET_KEY: "sk_test_x",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    AGENT_TOOL_SIGNING_SECRET: env.signing,
  }),
  getEnvStatus: () => ({ stripe: true }),
  resetServerEnvCache: vi.fn(),
}));
vi.mock("@/lib/telephony/provision-phone-line", () => ({
  provisionPhoneLinesForOrganization: vi.fn(async () => []),
}));
const dbHolder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/db", async (orig) => {
  const actual = await orig<typeof import("@/lib/db")>();
  return { ...actual, getDb: () => dbHolder.db };
});

import { billingProvider } from "@/lib/billing/provider";
import { createStripeClient, ensureOrderPrice, resetStripeCaches } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/lib/billing/stripe-webhook";
import { reportMissedOrderUsage } from "@/lib/billing/report-usage";
import { cronToken } from "@/lib/cron/cron-token";
import { POST as sweepPOST } from "@/app/api/billing/usage-sweep/route";

type Call = { method: string; path: string; body: URLSearchParams };

function fakeStripe(handler?: (method: string, path: string, body: URLSearchParams) => Response | undefined) {
  const calls: Call[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/v1/, "");
    const method = init?.method ?? "GET";
    const body = new URLSearchParams(method === "GET" ? u.search : String(init?.body ?? ""));
    calls.push({ method, path, body });
    const custom = handler?.(method, path, body);
    if (custom) return custom;
    if (method === "GET") return new Response(JSON.stringify({ data: [] }), { status: 200 });
    const url2 = path === "/checkout/sessions" ? "https://checkout.stripe.com/c/pay/cs_1" : undefined;
    return new Response(JSON.stringify({ id: path === "/prices" ? "price_1" : "obj_1", url: url2 }), { status: 200 });
  });
  return { fn, calls };
}

async function seedOrg(db: Db, fields: Record<string, unknown> = {}) {
  const { data: org } = await db
    .from("organizations")
    .insert({ name: "Joe's", slug: `o-${Math.random().toString(36).slice(2, 8)}`, ...fields })
    .select("id")
    .single();
  const { data: r } = await db.from("restaurants").insert({ name: "Joe's", organization_id: org!.id }).select("id").single();
  return { orgId: org!.id as string, restaurantId: r!.id as string };
}

async function seedReceipt(db: Db, restaurantId: string, sessionId: string, createdAt: string, extra: Record<string, unknown> = {}) {
  await db.from("phone_order_receipts").insert({
    restaurant_id: restaurantId,
    session_id: sessionId,
    items: [{ name: "Pepperoni", quantity: 1, unit_price: 12 }],
    created_at: createdAt,
    ...extra,
  });
}

beforeEach(() => {
  env.signing = "sign_secret";
  resetStripeCaches();
});

describe("checkout sales tax", () => {
  it("asks for a billing address and turns on automatic tax", async () => {
    const db = createMemoryDb();
    const { orgId } = await seedOrg(db);
    const { fn, calls } = fakeStripe();
    const result = await billingProvider.createCheckoutSession(
      { organizationId: orgId, planId: "starter", successUrl: "https://app/ok", cancelUrl: "https://app/no" },
      { db, fetchImpl: fn as never }
    );
    expect(result.ok).toBe(true);
    const session = calls.find((c) => c.path === "/checkout/sessions")!;
    expect(session.body.get("automatic_tax[enabled]")).toBe("true");
    expect(session.body.get("billing_address_collection")).toBe("required");
    expect(session.body.get("customer_update[address]")).toBe("auto");
    expect(session.body.get("tax_id_collection[enabled]")).toBe("true");
  });

  it("still opens checkout, without tax, when the account has not switched tax on", async () => {
    const db = createMemoryDb();
    const { orgId } = await seedOrg(db);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { fn, calls } = fakeStripe((method, path, body) =>
      method === "POST" && path === "/checkout/sessions" && body.get("automatic_tax[enabled]")
        ? new Response(JSON.stringify({ error: { message: "Stripe Tax has not been activated on your account." } }), { status: 400 })
        : undefined
    );
    const result = await billingProvider.createCheckoutSession(
      { organizationId: orgId, planId: "starter", successUrl: "https://app/ok", cancelUrl: "https://app/no" },
      { db, fetchImpl: fn as never }
    );
    expect(result).toEqual({ ok: true, url: "https://checkout.stripe.com/c/pay/cs_1" });
    const sessions = calls.filter((c) => c.path === "/checkout/sessions");
    expect(sessions).toHaveLength(2);
    expect(sessions[1].body.get("automatic_tax[enabled]")).toBeNull();
    expect(sessions[1].body.get("billing_address_collection")).toBe("required");
  });

  it("creates the order price with tax added on top", async () => {
    const { fn, calls } = fakeStripe();
    await ensureOrderPrice(createStripeClient("sk_test_x", fn as never));
    const price = calls.find((c) => c.method === "POST" && c.path === "/prices")!;
    expect(price.body.get("tax_behavior")).toBe("exclusive");
    expect(price.body.get("product_data[tax_code]")).toBe("txcd_10103001");
  });

  it("sets tax behavior once on an existing price that has none", async () => {
    const { fn, calls } = fakeStripe((method, path) =>
      method === "GET" && path === "/prices"
        ? new Response(JSON.stringify({ data: [{ id: "price_old", tax_behavior: "unspecified" }] }), { status: 200 })
        : undefined
    );
    expect(await ensureOrderPrice(createStripeClient("sk_test_x", fn as never))).toBe("price_old");
    const update = calls.find((c) => c.method === "POST" && c.path === "/prices/price_old")!;
    expect(update.body.get("tax_behavior")).toBe("exclusive");
  });
});

describe("missed usage catch-up", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");

  it("bills only unreported orders from the current billing period", async () => {
    const db = createMemoryDb();
    const { restaurantId } = await seedOrg(db, {
      subscription_status: "active",
      stripe_customer_id: "cus_1",
      billing_period_start: "2026-10-01T00:00:00Z",
      plan_activated_at: "2026-09-01T00:00:00Z",
    });
    await seedReceipt(db, restaurantId, "conv_missed", "2026-10-10T00:00:00Z");
    await seedReceipt(db, restaurantId, "conv_done", "2026-10-11T00:00:00Z", { usage_reported_at: "2026-10-11T00:00:05Z" });
    await seedReceipt(db, restaurantId, "conv_last_month", "2026-09-20T00:00:00Z");
    await seedReceipt(db, restaurantId, "roal-harness-9", "2026-10-12T00:00:00Z");

    const { fn, calls } = fakeStripe();
    const result = await reportMissedOrderUsage(db, { stripe: createStripeClient("sk_test_x", fn as never), now });
    expect(result).toEqual({ checked: 1, reported: 1, failed: 0 });
    const events = calls.filter((c) => c.path === "/billing/meter_events");
    expect(events).toHaveLength(1);
    expect(events[0].body.get("identifier")).toBe(`${restaurantId}:conv_missed`);
  });

  it("never bills orders from before the plan started or from inactive plans", async () => {
    const db = createMemoryDb();
    const trialOnly = await seedOrg(db, { stripe_customer_id: "cus_2", billing_period_start: "2026-10-01T00:00:00Z" });
    await seedReceipt(db, trialOnly.restaurantId, "conv_trial", "2026-10-05T00:00:00Z");
    const fresh = await seedOrg(db, {
      subscription_status: "active",
      stripe_customer_id: "cus_3",
      billing_period_start: "2026-10-01T00:00:00Z",
      plan_activated_at: "2026-10-15T00:00:00Z",
    });
    await seedReceipt(db, fresh.restaurantId, "conv_before_plan", "2026-10-05T00:00:00Z");

    const { fn } = fakeStripe();
    const result = await reportMissedOrderUsage(db, { stripe: createStripeClient("sk_test_x", fn as never), now });
    expect(result.checked).toBe(0);
    expect(fn).not.toHaveBeenCalled();
  });

  it("stamps when the plan first turned on, and keeps it on later events", async () => {
    const db = createMemoryDb();
    const { orgId } = await seedOrg(db);
    const event = (id: string) => ({
      id,
      type: "checkout.session.completed",
      data: { object: { mode: "subscription", payment_status: "paid", client_reference_id: orgId, customer: "cus_9" } },
    });
    await handleStripeEvent(db, event("evt_1"), { provisionLines: async () => [] });
    const first = (await db.from("organizations").select("plan_activated_at").eq("id", orgId).single()).data as {
      plan_activated_at: string;
    };
    expect(first.plan_activated_at).toBeTruthy();
    await new Promise((r) => setTimeout(r, 5));
    await handleStripeEvent(db, event("evt_2"), { provisionLines: async () => [] });
    const second = (await db.from("organizations").select("plan_activated_at").eq("id", orgId).single()).data as {
      plan_activated_at: string;
    };
    expect(second.plan_activated_at).toBe(first.plan_activated_at);
  });
});

describe("usage sweep route", () => {
  it("rejects calls without the background-job token", async () => {
    dbHolder.db = createMemoryDb();
    const res = await sweepPOST(new Request("https://app/api/billing/usage-sweep", { method: "POST" }));
    expect(res.status).toBe(401);
    const wrong = await sweepPOST(
      new Request("https://app/api/billing/usage-sweep", { method: "POST", headers: { Authorization: "Bearer nope" } })
    );
    expect(wrong.status).toBe(401);
  });

  it("runs with the derived token", async () => {
    dbHolder.db = createMemoryDb();
    const res = await sweepPOST(
      new Request("https://app/api/billing/usage-sweep", {
        method: "POST",
        headers: { Authorization: `Bearer ${cronToken("sign_secret")}` },
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, checked: 0 });
  });
});
