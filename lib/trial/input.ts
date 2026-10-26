import type { TrialSourceKind } from "@/lib/trial/types";

export type ParsedTrialInput =
  | { kind: "website"; url: string }
  | { kind: "maps"; url: string; query: string | null }
  | { kind: "name_city"; name: string; city: string | null };

const MAPS_HOSTS = ["maps.google.", "google.com/maps", "goo.gl/maps", "maps.app.goo.gl", "g.page"];

function normalizeUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!url.hostname.includes(".")) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function isMapsUrl(url: URL): boolean {
  const full = `${url.hostname}${url.pathname}`.toLowerCase();
  return MAPS_HOSTS.some((h) => full.includes(h));
}

/** Extract the human query from a Google Maps URL (`/maps/place/<name>/...` or `?q=`). */
export function mapsQueryFromUrl(url: URL): string | null {
  const q = url.searchParams.get("q") || url.searchParams.get("query");
  if (q?.trim()) return q.trim();
  const m = url.pathname.match(/\/maps\/place\/([^/]+)/);
  if (m?.[1]) {
    try {
      return decodeURIComponent(m[1]).replace(/\+/g, " ").trim();
    } catch {
      return m[1].replace(/\+/g, " ").trim();
    }
  }
  return null;
}

export function parseTrialInput(raw: unknown): ParsedTrialInput | { error: string } {
  const text = typeof raw === "string" ? raw.trim().slice(0, 500) : "";
  if (!text) return { error: "Paste your restaurant website or Google Maps link." };

  const looksLikeUrl = /^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(text) || /^https?:\/\//i.test(text);
  if (looksLikeUrl) {
    const url = normalizeUrl(text);
    if (!url) return { error: "That link does not look valid. Try the full website address." };
    if (isMapsUrl(url)) {
      return { kind: "maps", url: url.toString(), query: mapsQueryFromUrl(url) };
    }
    return { kind: "website", url: url.toString() };
  }

  const parts = text.split(/,|\s+in\s+|\s+-\s+/i).map((p) => p.trim()).filter(Boolean);
  const name = parts[0] ?? text;
  const city = parts.slice(1).join(", ") || null;
  if (name.length < 2) return { error: "Enter a restaurant name or paste a link." };
  return { kind: "name_city", name, city };
}

export function sourceKindFromParsed(parsed: ParsedTrialInput): TrialSourceKind {
  return parsed.kind;
}
