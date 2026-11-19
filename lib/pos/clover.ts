/**
 * Clover REST client: OAuth v2 (expiring tokens), custom order create, and print_event.
 * Orders are created unpaid (the customer pays at pickup on the restaurant's own Clover),
 * then sent to the merchant's default order printer.
 *
 * App permissions: Read merchant, Read/Write orders, Read inventory (for tax rates).
 * Env: CLOVER_APP_ID, CLOVER_APP_SECRET, CLOVER_ENVIRONMENT ("sandbox" | "production", default sandbox).
 */

export type CloverEnvironment = "sandbox" | "production";

export type CloverConfig = {
  appId: string;
  appSecret: string;
  environment: CloverEnvironment;
};

export type CloverTokens = {
  accessToken: string;
  accessTokenExpiresAt: number | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: number | null;
};

export type CloverOrderLine = {
  name: string;
  quantity: number;
  /** Price of one unit including paid add-ons, in cents. */
  unitPriceCents: number;
  note: string | null;
};

export type CloverOrderInput = {
  lines: CloverOrderLine[];
  customerName: string | null;
  customerPhone: string | null;
  fulfillmentType: string;
  deliveryAddress: string | null;
  deliveryInstructions: string | null;
};

type FetchLike = typeof fetch;

const HOSTS: Record<CloverEnvironment, { web: string; api: string }> = {
  sandbox: { web: "https://sandbox.dev.clover.com", api: "https://apisandbox.dev.clover.com" },
  production: { web: "https://www.clover.com", api: "https://api.clover.com" },
};

/** Clover line items are single units; cap repeats so a bad quantity can't flood the ticket. */
const MAX_UNITS_PER_LINE = 25;
const REQUEST_TIMEOUT_MS = 5000;

export function getCloverConfig(env: NodeJS.ProcessEnv = process.env): CloverConfig | null {
  const appId = env.CLOVER_APP_ID?.trim();
  const appSecret = env.CLOVER_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;
  const environment: CloverEnvironment = env.CLOVER_ENVIRONMENT?.trim() === "production" ? "production" : "sandbox";
  return { appId, appSecret, environment };
}

export function cloverAuthorizeUrl(config: CloverConfig, redirectUri: string, state: string): string {
  const url = new URL("/oauth/v2/authorize", HOSTS[config.environment].web);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

export class CloverApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "CloverApiError";
  }
}

async function cloverFetch(
  fetchImpl: FetchLike,
  url: string,
  init: { method: "GET" | "POST" | "DELETE"; body?: unknown; accessToken?: string }
): Promise<unknown> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (init.accessToken) headers.authorization = `Bearer ${init.accessToken}`;
  const res = await fetchImpl(url, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const message =
      (json && typeof json === "object" && "message" in json && typeof json.message === "string" && json.message) ||
      text.slice(0, 200) ||
      `HTTP ${res.status}`;
    throw new CloverApiError(`Clover ${res.status}: ${message}`, res.status);
  }
  return json;
}

function parseTokens(json: unknown): CloverTokens {
  const t = (json ?? {}) as Record<string, unknown>;
  if (typeof t.access_token !== "string" || !t.access_token) {
    throw new CloverApiError("Clover did not return an access token.", 502);
  }
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    accessToken: t.access_token,
    accessTokenExpiresAt: num(t.access_token_expiration),
    refreshToken: typeof t.refresh_token === "string" ? t.refresh_token : null,
    refreshTokenExpiresAt: num(t.refresh_token_expiration),
  };
}

export async function exchangeCloverCode(
  config: CloverConfig,
  code: string,
  fetchImpl: FetchLike = fetch
): Promise<CloverTokens> {
  const json = await cloverFetch(fetchImpl, `${HOSTS[config.environment].api}/oauth/v2/token`, {
    method: "POST",
    body: { client_id: config.appId, client_secret: config.appSecret, code },
  });
  return parseTokens(json);
}

export async function refreshCloverTokens(
  config: CloverConfig,
  refreshToken: string,
  fetchImpl: FetchLike = fetch
): Promise<CloverTokens> {
  const json = await cloverFetch(fetchImpl, `${HOSTS[config.environment].api}/oauth/v2/refresh`, {
    method: "POST",
    body: { client_id: config.appId, refresh_token: refreshToken },
  });
  return parseTokens(json);
}

export async function fetchCloverMerchantName(
  config: CloverConfig,
  merchantId: string,
  accessToken: string,
  fetchImpl: FetchLike = fetch
): Promise<string | null> {
  const json = await cloverFetch(
    fetchImpl,
    `${HOSTS[config.environment].api}/v3/merchants/${encodeURIComponent(merchantId)}`,
    { method: "GET", accessToken }
  );
  const name = (json as Record<string, unknown> | null)?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

/** Ticket header shown on the Clover order and printout. */
export function cloverOrderTitle(input: CloverOrderInput): string {
  const mode = input.fulfillmentType === "delivery" ? "DELIVERY" : "PICKUP";
  const who = [input.customerName, input.customerPhone].filter(Boolean).join(" ");
  return `ROAL phone · ${mode}${who ? ` · ${who}` : ""}`.slice(0, 127);
}

export function cloverOrderNote(input: CloverOrderInput): string {
  const parts = ["Pay at pickup. Ordered by phone via ROAL."];
  if (input.fulfillmentType === "delivery" && input.deliveryAddress) {
    parts.push(`Deliver to: ${input.deliveryAddress}`);
    if (input.deliveryInstructions) parts.push(`Instructions: ${input.deliveryInstructions}`);
  }
  return parts.join("\n").slice(0, 2000);
}

/** A merchant tax rate as Clover expects it on a line item: id, name and rate (rate is percent × 100000). */
export type CloverTaxRateRef = { id: string; name: string; rate: number };

export type CloverLineItemBody = { name: string; price: number; note?: string; taxRates?: CloverTaxRateRef[] };

/** One Clover line item per unit (Clover line items are single units), with the merchant's default taxes. */
export function buildCloverLineItems(input: CloverOrderInput, defaultTaxRates: CloverTaxRateRef[] = []): CloverLineItemBody[] {
  const taxRates = defaultTaxRates.length ? defaultTaxRates : undefined;
  const lineItems: CloverLineItemBody[] = [];
  for (const line of input.lines) {
    const units = Math.min(MAX_UNITS_PER_LINE, Math.max(1, Math.round(line.quantity)));
    for (let i = 0; i < units; i += 1) {
      lineItems.push({
        name: line.name.slice(0, 127),
        price: Math.max(0, Math.round(line.unitPriceCents)),
        ...(line.note ? { note: line.note.slice(0, 255) } : {}),
        ...(taxRates ? { taxRates } : {}),
      });
    }
  }
  return lineItems;
}

/**
 * Clover's REST API does not compute totals for orders built from custom line items, so the
 * dashboard and register would show $0.00. Total = subtotal + tax, in cents. Clover rates are
 * percent × 100000 (6.625% = 662500), so tax = subtotal × rate / 10,000,000, rounded per rate.
 */
export function cloverOrderTotalCents(lineItems: CloverLineItemBody[], taxRates: CloverTaxRateRef[]): number {
  const subtotal = lineItems.reduce((sum, li) => sum + li.price, 0);
  const tax = taxRates.reduce((sum, t) => sum + Math.round((subtotal * t.rate) / 10_000_000), 0);
  return subtotal + tax;
}

/**
 * The merchant's default tax rates. Custom (non-inventory) line items are untaxed unless rates are
 * attached, so without this the register would ring up phone orders with no sales tax.
 * Needs the "Read inventory" permission; returns [] when unavailable so the order still goes through.
 */
export async function fetchCloverDefaultTaxRates(
  config: CloverConfig,
  merchantId: string,
  accessToken: string,
  fetchImpl: FetchLike = fetch
): Promise<CloverTaxRateRef[]> {
  try {
    const json = await cloverFetch(
      fetchImpl,
      `${HOSTS[config.environment].api}/v3/merchants/${encodeURIComponent(merchantId)}/tax_rates`,
      { method: "GET", accessToken }
    );
    const elements = ((json as Record<string, unknown> | null)?.elements ?? []) as Array<Record<string, unknown>>;
    return elements
      .filter((t) => t.isDefault === true && typeof t.id === "string" && typeof t.rate === "number")
      .map((t) => ({ id: t.id as string, name: typeof t.name === "string" ? t.name : "Tax", rate: t.rate as number }));
  } catch {
    return [];
  }
}

/**
 * Creates the order on the merchant's Clover (Clover's documented custom-order flow: open order,
 * then line items), and asks it to print. Returns the Clover order id.
 */
export async function sendOrderToClover(
  config: CloverConfig,
  merchantId: string,
  accessToken: string,
  input: CloverOrderInput,
  fetchImpl: FetchLike = fetch
): Promise<{ orderId: string; printed: boolean; printError: string | null; taxed: boolean }> {
  const base = `${HOSTS[config.environment].api}/v3/merchants/${encodeURIComponent(merchantId)}`;
  const taxRates = await fetchCloverDefaultTaxRates(config, merchantId, accessToken, fetchImpl);
  const created = await cloverFetch(fetchImpl, `${base}/orders`, {
    method: "POST",
    accessToken,
    body: { title: cloverOrderTitle(input), note: cloverOrderNote(input), state: "open" },
  });
  const orderId = (created as Record<string, unknown> | null)?.id;
  if (typeof orderId !== "string" || !orderId) {
    throw new CloverApiError("Clover did not return an order id.", 502);
  }
  const lineItems = buildCloverLineItems(input, taxRates);
  try {
    await cloverFetch(fetchImpl, `${base}/orders/${encodeURIComponent(orderId)}/bulk_line_items`, {
      method: "POST",
      accessToken,
      body: { items: lineItems },
    });
    await cloverFetch(fetchImpl, `${base}/orders/${encodeURIComponent(orderId)}`, {
      method: "POST",
      accessToken,
      body: { total: cloverOrderTotalCents(lineItems, taxRates) },
    });
  } catch (e) {
    // Don't leave an empty ticket on their register.
    await cloverFetch(fetchImpl, `${base}/orders/${encodeURIComponent(orderId)}`, { method: "DELETE", accessToken }).catch(() => null);
    throw e;
  }
  try {
    await cloverFetch(fetchImpl, `${base}/print_event`, {
      method: "POST",
      accessToken,
      body: { orderRef: { id: orderId } },
    });
    return { orderId, printed: true, printError: null, taxed: taxRates.length > 0 };
  } catch (e) {
    // The order is on their Clover even if printing failed; staff can print it there.
    return {
      orderId,
      printed: false,
      printError: e instanceof Error ? e.message : "Print failed",
      taxed: taxRates.length > 0,
    };
  }
}
