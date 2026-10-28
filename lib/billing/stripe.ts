import { createHmac, timingSafeEqual } from "node:crypto";
import { BILLABLE_PHONE_ORDER_RATE_USD } from "@/lib/billing/billable-orders";

/**
 * Thin Stripe REST client (no SDK, same style as the Twilio calls in lib/telephony).
 * Pricing is one usage-based price: $0.90 per completed order, billed monthly through a
 * Billing Meter. The meter, product and price are created on first use so nothing has to be
 * set up by hand in the Stripe dashboard.
 */

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export const STRIPE_API_BASE = "https://api.stripe.com/v1";
export const ORDER_METER_EVENT_NAME = "roal_completed_order";
export const ORDER_PRICE_LOOKUP_KEY = "roal_completed_order_v1";

type Params = Record<string, unknown>;

export class StripeApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = "StripeApiError";
  }
}

/** Stripe form encoding: nested objects become `a[b][c]=v`, arrays `a[0]=v`. */
export function encodeStripeForm(params: Params, prefix = ""): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === "object") {
          out.push(...encodeStripeForm(item as Params, `${name}[${i}]`));
        } else {
          out.push(`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === "object") {
      out.push(...encodeStripeForm(value as Params, name));
    } else {
      out.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return out;
}

export type StripeClient = {
  get<T = Record<string, unknown>>(path: string, query?: Params): Promise<T>;
  post<T = Record<string, unknown>>(path: string, body?: Params, opts?: { idempotencyKey?: string; timeoutMs?: number }): Promise<T>;
};

export function createStripeClient(secretKey: string, fetchImpl: FetchFn = fetch): StripeClient {
  async function call<T>(method: "GET" | "POST", path: string, params: Params | undefined, opts?: { idempotencyKey?: string; timeoutMs?: number }) {
    const encoded = params ? encodeStripeForm(params).join("&") : "";
    const url = method === "GET" && encoded ? `${STRIPE_API_BASE}${path}?${encoded}` : `${STRIPE_API_BASE}${path}`;
    const headers: Record<string, string> = { Authorization: `Bearer ${secretKey}` };
    if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
    if (opts?.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
    const res = await fetchImpl(url, {
      method,
      headers,
      body: method === "POST" ? encoded : undefined,
      signal: opts?.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const err = (body.error ?? {}) as { message?: string; code?: string };
      throw new StripeApiError(res.status, `Stripe ${res.status}: ${err.message ?? "request failed"}`, err.code);
    }
    return body as T;
  }
  return {
    get: (path, query) => call("GET", path, query),
    post: (path, body, opts) => call("POST", path, body ?? {}, opts),
  };
}

type StripeList<T> = { data?: T[] };

let cachedOrderPriceId: string | null = null;

export function resetStripeCaches() {
  cachedOrderPriceId = null;
}

/** The $0.90-per-order monthly metered price, created (with its meter) if missing. */
export async function ensureOrderPrice(stripe: StripeClient): Promise<string> {
  if (cachedOrderPriceId) return cachedOrderPriceId;

  const prices = await stripe.get<StripeList<{ id: string }>>("/prices", {
    lookup_keys: [ORDER_PRICE_LOOKUP_KEY],
    active: true,
    limit: 1,
  });
  if (prices.data?.[0]?.id) {
    cachedOrderPriceId = prices.data[0].id;
    return cachedOrderPriceId;
  }

  const meters = await stripe.get<StripeList<{ id: string; event_name: string }>>("/billing/meters", {
    status: "active",
    limit: 100,
  });
  let meterId = meters.data?.find((m) => m.event_name === ORDER_METER_EVENT_NAME)?.id;
  if (!meterId) {
    const meter = await stripe.post<{ id: string }>(
      "/billing/meters",
      {
        display_name: "Completed phone orders",
        event_name: ORDER_METER_EVENT_NAME,
        default_aggregation: { formula: "sum" },
        customer_mapping: { type: "by_id", event_payload_key: "stripe_customer_id" },
        value_settings: { event_payload_key: "value" },
      },
      { idempotencyKey: `meter-${ORDER_METER_EVENT_NAME}` }
    );
    meterId = meter.id;
  }

  const price = await stripe.post<{ id: string }>(
    "/prices",
    {
      currency: "usd",
      unit_amount: Math.round(BILLABLE_PHONE_ORDER_RATE_USD * 100),
      recurring: { interval: "month", usage_type: "metered", meter: meterId },
      product_data: { name: "ROAL completed phone orders" },
      lookup_key: ORDER_PRICE_LOOKUP_KEY,
      nickname: "Per completed order",
    },
    { idempotencyKey: `price-${ORDER_PRICE_LOOKUP_KEY}` }
  );
  cachedOrderPriceId = price.id;
  return price.id;
}

/** Customer portal needs a saved configuration; create a simple one if the account has none. */
export async function ensurePortalConfiguration(stripe: StripeClient): Promise<string> {
  const configs = await stripe.get<StripeList<{ id: string }>>("/billing_portal/configurations", {
    is_default: true,
    active: true,
    limit: 1,
  });
  if (configs.data?.[0]?.id) return configs.data[0].id;
  const created = await stripe.post<{ id: string }>(
    "/billing_portal/configurations",
    {
      business_profile: { headline: "Your ROAL plan" },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ["email", "address", "name"] },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
      },
    },
    { idempotencyKey: "roal-portal-config-v1" }
  );
  return created.id;
}

export type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

/**
 * Verify a `Stripe-Signature` header (`t=…,v1=…`) against the raw request body.
 * Returns the parsed event, or null when the signature is missing, wrong or too old.
 */
export function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300
): StripeEvent | null {
  if (!signatureHeader || !secret) return null;
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") timestamp = Number(v);
    else if (k === "v1" && v) signatures.push(v);
  }
  if (!timestamp || !Number.isFinite(timestamp) || signatures.length === 0) return null;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return null;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  const matches = signatures.some((sig) => {
    const given = Buffer.from(sig, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!matches) return null;

  try {
    return JSON.parse(rawBody) as StripeEvent;
  } catch {
    return null;
  }
}

/** Test helper / local tooling: build a valid signature header for a payload. */
export function signStripePayload(rawBody: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const sig = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}
