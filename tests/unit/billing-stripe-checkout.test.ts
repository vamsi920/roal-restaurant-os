import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryDb, type Db } from "@/lib/db";

const env = vi.hoisted(() => ({
  secret: "sk_test_x" as string | undefined,
  publishable: "pk_test_x" as string | undefined,
  webhookSecret: "whsec_test" as string | undefined,
}));

vi.mock("@/lib/env.server", () => ({
  getServerEnv: () => ({
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: env.publishable,
    STRIPE_SECRET_KEY: env.secret,
    STRIPE_WEBHOOK_SECRET: env.webhookSecret,
  }),
  getEnvStatus: () => ({ stripe: Boolean(env.secret && env.publishable) }),
  resetServerEnvCache: vi.fn(),
}));

const provision = vi.hoisted(() => ({
  fn: vi.fn(async (_db: unknown, _orgId: string) => [
    { restaurantId: "r1", result: { ok: true as const, phoneNumber: "+15125550100", alreadyHad: false } },
  ]),
}));
vi.mock("@/lib/telephony/provision-phone-line", () => ({
  provisionPhoneLinesForOrganization: provision.fn,
}));

const dbHolder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/db", async (orig) => {
  const actual = await orig<typeof import("@/lib/db")>();
  return { ...actual, getDb: () => dbHolder.db };
});

import { billingProvider } from "@/lib/billing/provider";
import {
  createStripeClient,
  encodeStripeForm,
  ensureOrderPrice,
  ORDER_METER_EVENT_NAME,
  resetStripeCaches,
  signStripePayload,
  verifyStripeWebhook,
} from "@/lib/billing/stripe";
import { handleStripeEvent, mapSubscriptionStatus } from "@/lib/billing/stripe-webhook";
import { reportCompletedOrderUsage } from "@/lib/billing/report-usage";
import { confirmCheckoutSession } from "@/lib/billing/confirm-checkout";
import { POST as webhookPOST } from "@/app/api/billing/webhook/route";

type Call = { method: string; path: string; body: URLSearchParams; headers: Record<string, string> };

/** Fake Stripe: records calls and answers with canned objects. */
function fakeStripe(overrides: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/v1/, "");
    const method = init?.method ?? "GET";
    calls.push({
      method,
      path,
      body: new URLSearchParams(method === "GET" ? u.search : String(init?.body ?? "")),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    const key = `${method} ${path}`;
    if (key in overrides) return new Response(JSON.stringify(overrides[key]), { status: 200 });
    if (method === "GET") return new Response(JSON.stringify({ data: [] }), { status: 200 });
    const ids: Record<string, string> = {
      "/customers": "cus_123",
      "/billing/meters": "mtr_123",
      "/prices": "price_123",
      "/billing_portal/configurations": "bpc_123",
    };
    const urls: Record<string, string> = {
      "/checkout/sessions": "https://checkout.stripe.com/c/pay/cs_test_1",
      "/billing_portal/sessions": "https://billing.stripe.com/p/session/1",
    };
    return new Response(JSON.stringify({ id: ids[path] ?? "obj_1", url: urls[path] }), { status: 200 });
  });
  return { fn, calls };
}

async function seedOrg(db: Db, fields: Record<string, unknown> = {}) {
  const slug = `org-${Math.random().toString(36).slice(2, 9)}`;
  const { data: org } = await db.from("organizations").insert({ name: "Joe's", slug, ...fields }).select("id").single();
  const { data: r } = await db
    .from("restaurants")
    .insert({ name: "Joe's Pizza", organization_id: org!.id })
    .select("id")
    .single();
  return { orgId: org!.id as string, restaurantId: r!.id as string };
}

async function orgRow(db: Db, id: string) {
  const { data } = await db.from("organizations").select("*").eq("id", id).single();
  return data as Record<string, unknown>;
}

beforeEach(() => {
  env.secret = "sk_test_x";
  env.publishable = "pk_test_x";
  env.webhookSecret = "whsec_test";
  resetStripeCaches();
  provision.fn.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("encodeStripeForm", () => {
  it("encodes nested objects and arrays the way Stripe expects", () => {
    const encoded = encodeStripeForm({ a: 1, line_items: [{ price: "p" }], meta: { org: "o 1" }, skip: undefined });
    expect(encoded).toEqual(["a=1", "line_items%5B0%5D%5Bprice%5D=p", "meta%5Borg%5D=o%201"]);
  });
});

describe("verifyStripeWebhook", () => {
  const body = JSON.stringify({ id: "evt_1", type: "ping", data: { object: {} } });

  it("accepts a correctly signed, fresh payload", () => {
    const now = 1_700_000_000;
    const header = signStripePayload(body, "whsec_test", now);
    expect(verifyStripeWebhook(body, header, "whsec_test", now)?.id).toBe("evt_1");
  });

  it("rejects a wrong secret, a tampered body, a stale timestamp and a missing header", () => {
    const now = 1_700_000_000;
    const header = signStripePayload(body, "whsec_test", now);
    expect(verifyStripeWebhook(body, header, "whsec_other", now)).toBeNull();
    expect(verifyStripeWebhook(body.replace("evt_1", "evt_2"), header, "whsec_test", now)).toBeNull();
    expect(verifyStripeWebhook(body, header, "whsec_test", now + 3600)).toBeNull();
    expect(verifyStripeWebhook(body, null, "whsec_test", now)).toBeNull();
  });
});

describe("ensureOrderPrice", () => {
  it("creates the order meter and a $0.90 monthly metered price when missing", async () => {
    const { fn, calls } = fakeStripe();
    const price = await ensureOrderPrice(createStripeClient("sk_test_x", fn as never));
    expect(price).toBe("price_123");

    const meter = calls.find((c) => c.method === "POST" && c.path === "/billing/meters")!;
    expect(meter.body.get("event_name")).toBe(ORDER_METER_EVENT_NAME);
    const created = calls.find((c) => c.method === "POST" && c.path === "/prices")!;
    expect(created.body.get("unit_amount")).toBe("90");
    expect(created.body.get("recurring[usage_type]")).toBe("metered");
    expect(created.body.get("recurring[meter]")).toBe("mtr_123");
  });

  it("reuses an existing price without creating anything", async () => {
    const { fn, calls } = fakeStripe({ "GET /prices": { data: [{ id: "price_existing" }] } });
    expect(await ensureOrderPrice(createStripeClient("sk_test_x", fn as never))).toBe("price_existing");
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });
});

describe("billingProvider.createCheckoutSession", () => {
  it("creates a customer once, saves it, and opens a subscription checkout for the order price", async () => {
    const db = createMemoryDb();
    const { orgId } = await seedOrg(db);
    const { fn, calls } = fakeStripe();

    const result = await billingProvider.createCheckoutSession(
      { organizationId: orgId, planId: "starter", successUrl: "https://app/ok?session_id={CHECKOUT_SESSION_ID}", cancelUrl: "https://app/no" },
      { db, fetchImpl: fn as never }
    );

    expect(result).toEqual({ ok: true, url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    expect((await orgRow(db, orgId)).stripe_customer_id).toBe("cus_123");
    const session = calls.find((c) => c.path === "/checkout/sessions")!;
    expect(session.body.get("mode")).toBe("subscription");
    expect(session.body.get("customer")).toBe("cus_123");
    expect(session.body.get("client_reference_id")).toBe(orgId);
    expect(session.body.get("line_items[0][price]")).toBe("price_123");
    expect(session.body.get("subscription_data[metadata][organization_id]")).toBe(orgId);
    expect(session.body.get("success_url")).toContain("{CHECKOUT_SESSION_ID}");
    expect(session.headers.Authorization).toBe("Bearer sk_test_x");

    // Second checkout reuses the saved customer.
    calls.length = 0;
    await billingProvider.createCheckoutSession(
      { organizationId: orgId, planId: "starter", successUrl: "https://app/ok", cancelUrl: "https://app/no" },
      { db, fetchImpl: fn as never }
    );
    expect(calls.some((c) => c.path === "/customers")).toBe(false);
  });

  it("returns plain wording when payment fails to open", async () => {
    const db = createMemoryDb();
    const { orgId } = await seedOrg(db);
    const fn = vi.fn(async () => new Response(JSON.stringify({ error: { message: "Invalid API Key" } }), { status: 401 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await billingProvider.createCheckoutSession(
      { organizationId: orgId, planId: "starter", successUrl: "https://app/ok", cancelUrl: "https://app/no" },
      { db, fetchImpl: fn as never }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("failed");
    expect(result.message).not.toMatch(/stripe|api key/i);
  });
});

describe("billingProvider.createPortalSession", () => {
  it("opens the payment page for an organization that has started its plan", async () => {
    const db = createMemoryDb();
    const { orgId } = await seedOrg(db, { stripe_customer_id: "cus_9" });
    const { fn, calls } = fakeStripe();
    const result = await billingProvider.createPortalSession({ organizationId: orgId, returnUrl: "https://app/billing" }, { db, fetchImpl: fn as never });
    expect(result).toEqual({ ok: true, url: "https://billing.stripe.com/p/session/1" });
    const portal = calls.find((c) => c.path === "/billing_portal/sessions")!;
    expect(portal.body.get("customer")).toBe("cus_9");
    expect(portal.body.get("configuration")).toBe("bpc_123");
  });

  it("asks the owner to start the plan first when there is no customer yet", async () => {
    const db = createMemoryDb();
    const { orgId } = await seedOrg(db);
    const { fn } = fakeStripe();
    const result = await billingProvider.createPortalSession({ organizationId: orgId, returnUrl: "https://app/billing" }, { db, fetchImpl: fn as never });
    expect(result.ok).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("handleStripeEvent", () => {
  it("activates the organization and sets up phone lines when checkout completes", async () => {
    const db = createMemoryDb();
    const { orgId } = await seedOrg(db);
    const outcome = await handleStripeEvent(db, {
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { mode: "subscription", payment_status: "paid", client_reference_id: orgId, customer: "cus_1", subscription: "sub_1" } },
    });
    expect(outcome).toMatchObject({ handled: true, organizationId: orgId, status: "active", linesProvisioned: 1 });
    expect(provision.fn).toHaveBeenCalledWith(db, orgId);
    expect(await orgRow(db, orgId)).toMatchObject({
      subscription_status: "active",
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
    });
  });

  it("finds the organization by customer on subscription updates and records the period", async () => {
    const db = createMemoryDb();
    const { orgId } = await seedOrg(db, { stripe_customer_id: "cus_2" });
    await handleStripeEvent(db, {
      id: "evt_2",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_2",
          customer: "cus_2",
          status: "active",
          metadata: {},
          items: { data: [{ current_period_start: 1_767_225_600, current_period_end: 1_769_904_000 }] },
        },
      },
    });
    const row = await orgRow(db, orgId);
    expect(row.subscription_status).toBe("active");
    expect(row.billing_period_start).toBe(new Date(1_767_225_600 * 1000).toISOString());
    expect(provision.fn).toHaveBeenCalledTimes(1);
  });

  it("cancels on subscription deleted without buying lines", async () => {
    const db = createMemoryDb();
    const { orgId } = await seedOrg(db, { stripe_customer_id: "cus_3", subscription_status: "active" });
    await handleStripeEvent(db, {
      id: "evt_3",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_3", customer: "cus_3", status: "canceled", metadata: { organization_id: orgId } } },
    });
    expect((await orgRow(db, orgId)).subscription_status).toBe("canceled");
    expect(provision.fn).not.toHaveBeenCalled();
  });

  it("waits on incomplete payments and ignores unrelated events", async () => {
    const db = createMemoryDb();
    expect(mapSubscriptionStatus("incomplete")).toBeNull();
    expect(mapSubscriptionStatus("past_due")).toBe("past_due");
    const out = await handleStripeEvent(db, { id: "evt_4", type: "invoice.paid", data: { object: {} } });
    expect(out.handled).toBe(false);
  });
});

describe("POST /api/billing/webhook", () => {
  function request(body: string, signature: string | null) {
    return new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      body,
      headers: signature ? { "stripe-signature": signature } : {},
    });
  }

  it("rejects unsigned requests", async () => {
    dbHolder.db = createMemoryDb();
    const res = await webhookPOST(request("{}", null));
    expect(res.status).toBe(400);
  });

  it("activates the plan from a signed checkout event", async () => {
    const db = createMemoryDb();
    dbHolder.db = db;
    const { orgId } = await seedOrg(db);
    const body = JSON.stringify({
      id: "evt_10",
      type: "checkout.session.completed",
      data: { object: { mode: "subscription", payment_status: "no_payment_required", client_reference_id: orgId, customer: "cus_10", subscription: "sub_10" } },
    });
    const res = await webhookPOST(request(body, signStripePayload(body, "whsec_test")));
    expect(res.status).toBe(200);
    expect((await orgRow(db, orgId)).subscription_status).toBe("active");
    expect(provision.fn).toHaveBeenCalledWith(db, orgId);
  });
});

describe("confirmCheckoutSession", () => {
  it("activates on return without waiting for the background event, but only for the owner's org", async () => {
    const db = createMemoryDb();
    const { orgId } = await seedOrg(db);
    const { orgId: otherOrg } = await seedOrg(db);
    const session = { id: "cs_test_1", status: "complete", mode: "subscription", payment_status: "paid", client_reference_id: orgId, customer: "cus_5", subscription: "sub_5" };
    const { fn } = fakeStripe({ "GET /checkout/sessions/cs_test_1": session });
    const stripe = createStripeClient("sk_test_x", fn as never);

    expect(await confirmCheckoutSession(db, stripe, { sessionId: "cs_test_1", organizationId: otherOrg })).toBe(false);
    expect((await orgRow(db, otherOrg)).subscription_status).toBe("trialing");

    expect(await confirmCheckoutSession(db, stripe, { sessionId: "cs_test_1", organizationId: orgId })).toBe(true);
    expect((await orgRow(db, orgId)).subscription_status).toBe("active");
    expect(provision.fn).not.toHaveBeenCalled();
    expect(await confirmCheckoutSession(db, stripe, { sessionId: "../evil", organizationId: orgId })).toBe(false);
  });
});

describe("reportCompletedOrderUsage", () => {
  async function seedReceipt(db: Db, restaurantId: string, sessionId: string) {
    await db.from("phone_order_receipts").insert({
      restaurant_id: restaurantId,
      session_id: sessionId,
      items: [{ name: "Pepperoni", quantity: 1, unit_price: 12 }],
    });
  }

  it("reports one order for an active plan, once", async () => {
    const db = createMemoryDb();
    const { restaurantId } = await seedOrg(db, { subscription_status: "active", stripe_customer_id: "cus_7" });
    await seedReceipt(db, restaurantId, "conv_1");
    const { fn, calls } = fakeStripe();
    const stripe = createStripeClient("sk_test_x", fn as never);

    expect(await reportCompletedOrderUsage(db, { restaurantId, sessionId: "conv_1" }, { stripe })).toEqual({ reported: true });
    const event = calls.find((c) => c.path === "/billing/meter_events")!;
    expect(event.body.get("event_name")).toBe(ORDER_METER_EVENT_NAME);
    expect(event.body.get("payload[stripe_customer_id]")).toBe("cus_7");
    expect(event.body.get("payload[value]")).toBe("1");
    expect(event.body.get("identifier")).toBe(`${restaurantId}:conv_1`);

    expect(await reportCompletedOrderUsage(db, { restaurantId, sessionId: "conv_1" }, { stripe })).toEqual({
      reported: false,
      reason: "already_reported",
    });
    expect(calls.filter((c) => c.path === "/billing/meter_events")).toHaveLength(1);
  });

  it("does not bill trial orders or test calls", async () => {
    const db = createMemoryDb();
    const { restaurantId } = await seedOrg(db);
    await seedReceipt(db, restaurantId, "conv_2");
    const { fn } = fakeStripe();
    const stripe = createStripeClient("sk_test_x", fn as never);
    expect(await reportCompletedOrderUsage(db, { restaurantId, sessionId: "conv_2" }, { stripe })).toMatchObject({ reason: "no_plan" });

    const active = await seedOrg(db, { subscription_status: "active", stripe_customer_id: "cus_8" });
    await seedReceipt(db, active.restaurantId, "roal-harness-1");
    expect(await reportCompletedOrderUsage(db, { restaurantId: active.restaurantId, sessionId: "roal-harness-1" }, { stripe })).toMatchObject({
      reason: "not_billable",
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it("leaves the order unstamped when reporting fails so it can be retried", async () => {
    const db = createMemoryDb();
    const { restaurantId } = await seedOrg(db, { subscription_status: "active", stripe_customer_id: "cus_9" });
    await seedReceipt(db, restaurantId, "conv_3");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fn = vi.fn(async () => new Response("{}", { status: 500 }));
    const stripe = createStripeClient("sk_test_x", fn as never);
    expect(await reportCompletedOrderUsage(db, { restaurantId, sessionId: "conv_3" }, { stripe })).toMatchObject({ reason: "failed" });
    const { data } = await db.from("phone_order_receipts").select("usage_reported_at").eq("session_id", "conv_3").single();
    expect(data?.usage_reported_at ?? null).toBeNull();
  });
});
