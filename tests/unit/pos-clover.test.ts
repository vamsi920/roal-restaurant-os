import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryDb, type Db } from "@/lib/db";
import { resetMemoryStore } from "@/lib/db/store";
import { buildCloverLineItems, cloverAuthorizeUrl, cloverOrderTotalCents, cloverOrderNote, cloverOrderTitle, getCloverConfig } from "@/lib/pos/clover";
import { freshCloverAccessToken, loadPosConnection, saveCloverConnection } from "@/lib/pos/connections";
import { posLines, pushOrderToPos, type PushOrderToPosInput } from "@/lib/pos/push-order";
import { openSecret, sealSecret, signOAuthState, verifyOAuthState } from "@/lib/pos/seal";

const RID = "rest_1";

function fakeClover(handler: (method: string, path: string, body: unknown) => { status?: number; json: unknown }) {
  const calls: Array<{ method: string; path: string; body: unknown; auth: string | null }> = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname;
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ method, path, body, auth: headers.authorization ?? null });
    const res = handler(method, path, body);
    return new Response(JSON.stringify(res.json), { status: res.status ?? 200 });
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

const order: PushOrderToPosInput = {
  restaurantId: RID,
  sessionId: "sess_1",
  lines: [
    { item_id: "i1", name: "Chicken Tikka", quantity: 2, customizations: ["Extra Rice"], unit_price: 12.5, notes: "extra spicy" },
    { item_id: "i2", name: "Mango Lassi", quantity: 1, customizations: [], unit_price: 4, notes: null },
  ],
  modifiers: [{ item_id: "i1", modifier_name: "Extra rice", extra_price: 1.25 }],
  customerName: "Priya",
  customerPhone: "+12015550123",
  fulfillmentType: "pickup",
  deliveryAddress: null,
  deliveryInstructions: null,
};

describe("pos seal", () => {
  beforeEach(() => {
    process.env.AGENT_TOOL_SIGNING_SECRET = "test_signing_secret";
  });

  it("round-trips sealed tokens and never stores plaintext", () => {
    const sealed = sealSecret("tok_abc");
    expect(sealed).not.toContain("tok_abc");
    expect(openSecret(sealed)).toBe("tok_abc");
  });

  it("rejects tampered or expired OAuth state", () => {
    const state = signOAuthState({ restaurantId: RID, userId: "u1" }, 1_000_000);
    expect(verifyOAuthState(state, 1_000_000)?.restaurantId).toBe(RID);
    expect(verifyOAuthState(`${state}x`, 1_000_000)).toBeNull();
    expect(verifyOAuthState(state, 1_000_000 + 16 * 60 * 1000)).toBeNull();
  });
});

describe("clover order cart", () => {
  it("adds paid add-ons to the unit price and lists choices in the note", () => {
    const lines = posLines(order.lines, order.modifiers);
    expect(lines[0]).toMatchObject({ unitPriceCents: 1375, note: "Extra Rice, Note: extra spicy" });
    expect(lines[1]).toMatchObject({ unitPriceCents: 400, note: null });
  });

  it("repeats single-unit line items per quantity and marks pay at pickup", () => {
    const input = { ...order, lines: posLines(order.lines, order.modifiers) };
    const items = buildCloverLineItems(input);
    expect(items).toHaveLength(3);
    expect(items[0]).not.toHaveProperty("taxRates");
    const nj = { id: "TAX1", name: "NJ Sales Tax", rate: 662500 };
    expect(buildCloverLineItems(input, [nj])[2]).toMatchObject({ name: "Mango Lassi", price: 400, taxRates: [nj] });
    expect(cloverOrderTitle(input)).toBe("ROAL phone · PICKUP · Priya +12015550123");
    expect(cloverOrderNote(input)).toContain("Pay at pickup");
    expect(cloverOrderTotalCents(buildCloverLineItems(input), [])).toBe(3150);
    expect(cloverOrderTotalCents(buildCloverLineItems(input), [{ id: "T", name: "NJ", rate: 662500 }])).toBe(3359);
  });

  it("uses the sandbox hosts unless production is set", () => {
    const config = getCloverConfig({ CLOVER_APP_ID: "app", CLOVER_APP_SECRET: "sec" } as NodeJS.ProcessEnv)!;
    expect(cloverAuthorizeUrl(config, "https://tryroal.com/cb", "st")).toMatch(/^https:\/\/sandbox\.dev\.clover\.com\/oauth\/v2\/authorize\?/);
    expect(getCloverConfig({} as NodeJS.ProcessEnv)).toBeNull();
  });
});

describe("pushOrderToPos", () => {
  let db: Db;
  beforeEach(async () => {
    process.env.AGENT_TOOL_SIGNING_SECRET = "test_signing_secret";
    process.env.CLOVER_APP_ID = "app";
    process.env.CLOVER_APP_SECRET = "sec";
    resetMemoryStore();
    db = createMemoryDb();
    await db.from("phone_order_receipts").insert({ restaurant_id: RID, session_id: "sess_1", items: [] });
  });

  it("does nothing when no register is connected", async () => {
    const clover = fakeClover(() => ({ json: {} }));
    expect(await pushOrderToPos(db, order, clover.fetch)).toEqual({ status: "not_connected" });
    expect(clover.calls).toHaveLength(0);
  });

  it("creates the order, prints it, and sends it only once", async () => {
    await saveCloverConnection(db, {
      restaurantId: RID,
      merchantId: "M1",
      merchantName: "Eggmania",
      environment: "sandbox",
      tokens: { accessToken: "tok", accessTokenExpiresAt: null, refreshToken: null, refreshTokenExpiresAt: null },
      connectedBy: "u1",
    });
    const clover = fakeClover((method, path) => {
      if (path.endsWith("/tax_rates")) return { json: { elements: [{ id: "TAX1", name: "NJ Sales Tax", rate: 662500, isDefault: true }, { id: "TAX2", name: "Other", rate: 100000, isDefault: false }] } };
      if (method === "POST" && path.endsWith("/orders")) return { json: { id: "ORD1" } };
      return { json: { id: "X" } };
    });

    expect(await pushOrderToPos(db, order, clover.fetch)).toEqual({ status: "sent", posOrderId: "ORD1", printed: true });
    expect(clover.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "GET /v3/merchants/M1/tax_rates",
      "POST /v3/merchants/M1/orders",
      "POST /v3/merchants/M1/orders/ORD1/bulk_line_items",
      "POST /v3/merchants/M1/orders/ORD1",
      "POST /v3/merchants/M1/print_event",
    ]);
    // 2 × 13.75 + 4.00 = 31.50 subtotal; 6.625% tax = 2.09 (rounded) → 33.59
    expect(clover.calls[3].body).toEqual({ total: 3359 });
    expect(clover.calls[1].auth).toBe("Bearer tok");
    expect(clover.calls[1].body).toMatchObject({ title: "ROAL phone · PICKUP · Priya +12015550123", state: "open" });
    const items = (clover.calls[2].body as { items: Array<{ taxRates?: unknown }> }).items;
    expect(items).toHaveLength(3);
    expect(items.every((i) => JSON.stringify(i.taxRates) === JSON.stringify([{ id: "TAX1", name: "NJ Sales Tax", rate: 662500 }]))).toBe(true);
    expect(clover.calls[4].body).toEqual({ orderRef: { id: "ORD1" } });

    expect(await pushOrderToPos(db, order, clover.fetch)).toEqual({ status: "already_sent", posOrderId: "ORD1" });
    expect(clover.calls).toHaveLength(5);
    expect((await loadPosConnection(db, RID))?.last_sync_error).toBeNull();
  });

  it("still sends the order untaxed when tax rates can't be read, and deletes an order whose items failed", async () => {
    await saveCloverConnection(db, {
      restaurantId: RID,
      merchantId: "M1",
      merchantName: null,
      environment: "sandbox",
      tokens: { accessToken: "tok", accessTokenExpiresAt: null, refreshToken: null, refreshTokenExpiresAt: null },
      connectedBy: "u1",
    });
    const clover = fakeClover((method, path) => {
      if (path.endsWith("/tax_rates")) return { status: 403, json: { message: "Forbidden" } };
      if (method === "POST" && path.endsWith("/orders")) return { json: { id: "ORD1" } };
      if (path.endsWith("/bulk_line_items")) return { status: 400, json: { message: "bad item" } };
      return { json: {} };
    });
    const res = await pushOrderToPos(db, order, clover.fetch);
    expect(res.status).toBe("failed");
    expect(clover.calls.map((c) => `${c.method} ${c.path}`)).toContain("DELETE /v3/merchants/M1/orders/ORD1");
  });

  it("records a failure without throwing", async () => {
    await saveCloverConnection(db, {
      restaurantId: RID,
      merchantId: "M1",
      merchantName: null,
      environment: "sandbox",
      tokens: { accessToken: "tok", accessTokenExpiresAt: null, refreshToken: null, refreshTokenExpiresAt: null },
      connectedBy: "u1",
    });
    const clover = fakeClover(() => ({ status: 401, json: { message: "Unauthorized" } }));
    const res = await pushOrderToPos(db, order, clover.fetch);
    expect(res.status).toBe("failed");
    expect((await loadPosConnection(db, RID))?.last_sync_error).toContain("401");
  });

  it("refreshes an access token that is about to expire", async () => {
    const now = 2_000_000_000;
    await saveCloverConnection(db, {
      restaurantId: RID,
      merchantId: "M1",
      merchantName: null,
      environment: "sandbox",
      tokens: { accessToken: "old", accessTokenExpiresAt: now + 60, refreshToken: "ref", refreshTokenExpiresAt: now + 9e6 },
      connectedBy: "u1",
    });
    const clover = fakeClover(() => ({ json: { access_token: "new", access_token_expiration: now + 1800, refresh_token: "ref2" } }));
    const row = (await loadPosConnection(db, RID))!;
    const fresh = await freshCloverAccessToken(db, row, getCloverConfig(), clover.fetch, now);
    expect(fresh.accessToken).toBe("new");
    expect(clover.calls[0]).toMatchObject({ path: "/oauth/v2/refresh", body: { client_id: "app", refresh_token: "ref" } });
    expect(openSecret((await loadPosConnection(db, RID))!.access_token_sealed)).toBe("new");
  });

  it("uses the token another request already refreshed when the single-use refresh token was spent", async () => {
    const now = 2_000_000_000;
    await saveCloverConnection(db, {
      restaurantId: RID,
      merchantId: "M1",
      merchantName: null,
      environment: "sandbox",
      tokens: { accessToken: "old", accessTokenExpiresAt: now + 60, refreshToken: "ref", refreshTokenExpiresAt: now + 9e6 },
      connectedBy: "u1",
    });
    const stale = (await loadPosConnection(db, RID))!;
    await db
      .from("pos_connections")
      .update({ access_token_sealed: sealSecret("won"), access_token_expires_at: now + 1800 })
      .eq("restaurant_id", RID);
    const clover = fakeClover(() => ({ status: 401, json: { message: "refresh token already used" } }));
    const fresh = await freshCloverAccessToken(db, stale, getCloverConfig(), clover.fetch, now);
    expect(fresh.accessToken).toBe("won");
  });
});
