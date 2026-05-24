/** Absolute origin for metadata, canonical URLs, and OG links. */

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
