import { getSiteOrigin, resolveLocalDevOrigin } from "@/lib/site-url";

/** Path prefix for the ElevenLabs webhook tool route handlers (app/api/agent-tools/*). */
export const AGENT_TOOLS_PATH_PREFIX = "/api/agent-tools";

/** Route slugs under /api/agent-tools, keyed by ElevenLabs tool name. */
export const AGENT_TOOL_ROUTE_SLUGS = {
  get_menu_items: "get-menu",
  get_restaurant_info: "get-restaurant-info",
  get_caller_history: "get-caller-history",
  submit_reservation_request: "submit-reservation-request",
  sync_draft_order: "sync-draft-order",
  finalize_order: "finalize-order",
  get_order_status: "get-order-status",
} as const;

export type AgentToolRouteName = keyof typeof AGENT_TOOL_ROUTE_SLUGS;
export type AgentToolRouteSlug = (typeof AGENT_TOOL_ROUTE_SLUGS)[AgentToolRouteName];

export class AgentToolsBaseUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentToolsBaseUrlError";
  }
}

function normalize(value: string | undefined | null): string | null {
  const trimmed = value?.trim().replace(/\/+$/, "");
  return trimmed ? trimmed : null;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Public origin ElevenLabs calls for webhook tools.
 *
 * Order: ROAL_AGENT_TOOLS_BASE_URL (e.g. an ngrok / cloudflared tunnel in local dev)
 * → getSiteOrigin() (NEXT_PUBLIC_APP_URL / VERCEL_URL). In production the result
 * must be https; in development it falls back to the local dev origin.
 */
export function agentToolsBaseUrl(): string {
  const explicit = normalize(process.env.ROAL_AGENT_TOOLS_BASE_URL);
  const site = normalize(getSiteOrigin());
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (explicit && isHttpsUrl(explicit)) return explicit;
    if (site && isHttpsUrl(site)) return site;
    throw new AgentToolsBaseUrlError(
      "Agent tool base URL is not a public https URL. Set ROAL_AGENT_TOOLS_BASE_URL or NEXT_PUBLIC_APP_URL to the deployed https origin so ElevenLabs can reach /api/agent-tools/*."
    );
  }

  return explicit ?? site ?? resolveLocalDevOrigin();
}

/** Like agentToolsBaseUrl() but returns null instead of throwing (diagnostics). */
export function tryAgentToolsBaseUrl(): string | null {
  try {
    return agentToolsBaseUrl();
  } catch {
    return null;
  }
}

/** True when ElevenLabs (on the public internet) could reach this base URL. */
export function isPubliclyReachableToolBase(base: string | null | undefined): boolean {
  if (!base || !isHttpsUrl(base)) return false;
  try {
    const host = new URL(base).hostname;
    return !(host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".localhost"));
  } catch {
    return false;
  }
}

/** `${base}/api/agent-tools/<slug>` */
export function agentToolUrl(slug: AgentToolRouteSlug, base: string = agentToolsBaseUrl()): string {
  return `${base.replace(/\/+$/, "")}${AGENT_TOOLS_PATH_PREFIX}/${slug}`;
}
