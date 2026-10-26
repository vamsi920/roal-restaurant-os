/** Absolute origin for metadata, canonical URLs, and OG links. */

export const ELEVENLABS_CONVERSATION_INIT_PATH =
  "/api/integrations/elevenlabs/conversation-init";

export function getSiteOrigin(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;

  return undefined;
}

export function getMetadataBase(): URL | undefined {
  const origin = getSiteOrigin();
  if (!origin) return undefined;
  try {
    return new URL(origin);
  } catch {
    return undefined;
  }
}

export function absoluteUrl(path: string): string | undefined {
  const origin = getSiteOrigin();
  if (!origin) return undefined;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}

/** Public conversation-init URL for the configured app origin. */
export function conversationInitAbsoluteUrl(origin?: string): string | undefined {
  const base = (origin ?? getSiteOrigin())?.replace(/\/$/, "");
  if (!base) return undefined;
  return `${base}${ELEVENLABS_CONVERSATION_INIT_PATH}`;
}

/** Local dev origin for LB-01 probes (`QA_DEV_ORIGIN`, `PORT`, or `:3020`). */
export function resolveLocalDevOrigin(): string {
  const explicit = process.env.QA_DEV_ORIGIN?.trim()?.replace(/\/$/, "");
  if (explicit) return explicit;
  const port = process.env.PORT?.trim() || process.env.QA_DEV_PORT?.trim() || "3020";
  return `http://localhost:${port}`;
}

export function parseUrlHost(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    return new URL(value.trim()).hostname;
  } catch {
    return null;
  }
}

export function webhookHostMatchesAppOrigin(input: {
  webhookUrl: string | null | undefined;
  appOrigin?: string | null;
}): { aligned: boolean; webhookHost: string | null; appHost: string | null } {
  const webhookHost = parseUrlHost(input.webhookUrl);
  const appHost = parseUrlHost(input.appOrigin ?? getSiteOrigin() ?? null);
  if (!webhookHost || !appHost) {
    return { aligned: false, webhookHost, appHost };
  }
  return { aligned: webhookHost === appHost, webhookHost, appHost };
}
