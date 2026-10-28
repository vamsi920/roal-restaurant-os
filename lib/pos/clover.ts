/**
 * Clover REST client: OAuth v2 (expiring tokens), atomic order create, and print_event.
 * Orders are created unpaid (the customer pays at pickup on the restaurant's own Clover),
 * then sent to the merchant's default order printer.
 *
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
  init: { method: "GET" | "POST"; body?: unknown; accessToken?: string }
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

export function buildCloverOrderCart(input: CloverOrderInput) {
  const lineItems: Array<{ name: string; price: number; note?: string }> = [];
  for (const line of input.lines) {
    const units = Math.min(MAX_UNITS_PER_LINE, Math.max(1, Math.round(line.quantity)));
    for (let i = 0; i < units; i += 1) {
      lineItems.push({
        name: line.name.slice(0, 127),
        price: Math.max(0, Math.round(line.unitPriceCents)),
        ...(line.note ? { note: line.note.slice(0, 255) } : {}),
      });
    }
  }
  return {
    orderCart: {
      title: cloverOrderTitle(input),
      note: cloverOrderNote(input),
      lineItems,
    },
  };
}

/** Creates the order on the merchant's Clover and asks it to print. Returns the Clover order id. */
export async function sendOrderToClover(
  config: CloverConfig,
  merchantId: string,
  accessToken: string,
  input: CloverOrderInput,
  fetchImpl: FetchLike = fetch
): Promise<{ orderId: string; printed: boolean; printError: string | null }> {
  const base = `${HOSTS[config.environment].api}/v3/merchants/${encodeURIComponent(merchantId)}`;
  const created = await cloverFetch(fetchImpl, `${base}/atomic_order/orders`, {
    method: "POST",
    accessToken,
    body: buildCloverOrderCart(input),
  });
  const orderId = (created as Record<string, unknown> | null)?.id;
  if (typeof orderId !== "string" || !orderId) {
    throw new CloverApiError("Clover did not return an order id.", 502);
  }
  try {
    await cloverFetch(fetchImpl, `${base}/print_event`, {
      method: "POST",
      accessToken,
      body: { orderRef: { id: orderId } },
    });
    return { orderId, printed: true, printError: null };
  } catch (e) {
    // The order is on their Clover even if printing failed; staff can print it there.
    return { orderId, printed: false, printError: e instanceof Error ? e.message : "Print failed" };
  }
}
