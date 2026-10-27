import {
  extractRestaurantProfileFromWebsiteText,
  type ExtractedRestaurantProfile,
} from "@/lib/ai";
import { htmlToPlainText } from "@/lib/restaurant-lookup/html-to-text";
import type { WeeklyHourInput } from "@/lib/restaurant-hours/core";
import { heuristicProfileFromHtml } from "@/lib/trial/heuristic-profile";
import type { TrialKnowledgeEntry, TrialProfile } from "@/lib/trial/types";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 400_000;
const INFO_PATHS = ["", "/contact", "/about", "/hours", "/location", "/contact-us", "/about-us"];

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export async function fetchPageText(url: string, fetchImpl: FetchFn = fetch): Promise<string | null> {
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "ROAL-agent-builder/1.0 (+https://getroal.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (type && !/text\/html|application\/xhtml|text\/plain/i.test(type)) return null;
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    return new TextDecoder("utf-8", { fatal: false }).decode(slice);
  } catch {
    return null;
  }
}

/** Fetch the homepage plus common info pages and return combined plain text. */
export async function collectWebsiteText(
  website: string,
  fetchImpl: FetchFn = fetch
): Promise<{ text: string; fetchedUrls: string[]; pages: Array<{ url: string; html: string }> }> {
  let origin: string;
  try {
    origin = new URL(website).origin;
  } catch {
    return { text: "", fetchedUrls: [], pages: [] };
  }
  const urls = [...new Set([website, ...INFO_PATHS.map((p) => `${origin}${p}`)])].slice(0, 5);
  const results = await Promise.all(urls.map((u) => fetchPageText(u, fetchImpl)));
  const chunks: string[] = [];
  const fetched: string[] = [];
  const pages: Array<{ url: string; html: string }> = [];
  results.forEach((html, i) => {
    if (!html) return;
    const text = htmlToPlainText(html, 25_000);
    if (text.length < 40) return;
    fetched.push(urls[i]);
    pages.push({ url: urls[i], html });
    chunks.push(`### ${urls[i]}\n${text}`);
  });
  return { text: chunks.join("\n\n").slice(0, 70_000), fetchedUrls: fetched, pages };
}

const KNOWLEDGE_CATEGORIES = new Set([
  "general",
  "hours",
  "menu",
  "allergens",
  "directions",
  "policies",
  "handoff",
]);

function cleanTime(value: string | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  const m = v.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

export function weeklyHoursFromExtracted(
  rows: ExtractedRestaurantProfile["weekly_hours"]
): WeeklyHourInput[] | null {
  if (!rows || rows.length === 0) return null;
  const byDay = new Map<number, WeeklyHourInput>();
  for (const r of rows) {
    const day = Number(r.day_of_week);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    const open = cleanTime(r.open_time);
    const close = cleanTime(r.close_time);
    const closed = Boolean(r.is_closed) || !open || !close;
    byDay.set(day, {
      day_of_week: day,
      is_closed: closed,
      open_time: closed ? null : open,
      close_time: closed ? null : close,
    });
  }
  if (byDay.size === 0) return null;
  const out: WeeklyHourInput[] = [];
  for (let d = 0; d < 7; d += 1) {
    out.push(
      byDay.get(d) ?? { day_of_week: d, is_closed: true, open_time: null, close_time: null }
    );
  }
  const anyOpen = out.some((r) => !r.is_closed);
  return anyOpen ? out : null;
}

export function knowledgeFromExtracted(
  faqs: ExtractedRestaurantProfile["faqs"]
): TrialKnowledgeEntry[] {
  if (!faqs) return [];
  const out: TrialKnowledgeEntry[] = [];
  for (const f of faqs) {
    const question = f.question?.trim().slice(0, 220);
    const answer = f.answer?.trim().slice(0, 1200);
    if (!question || question.length < 2 || !answer || answer.length < 2) continue;
    const category = KNOWLEDGE_CATEGORIES.has(f.category ?? "")
      ? (f.category as TrialKnowledgeEntry["category"])
      : "general";
    out.push({ category, question, answer });
    if (out.length >= 8) break;
  }
  return out;
}

export function profileFromExtracted(
  extracted: ExtractedRestaurantProfile,
  website: string
): TrialProfile {
  const country = (extracted.country ?? "US").trim().slice(0, 2).toUpperCase();
  const phoneRaw = extracted.phone?.trim() ?? "";
  const phone = /^[\d\s+().-]{7,24}$/.test(phoneRaw) ? phoneRaw : null;
  return {
    name: extracted.name?.trim() || "Your restaurant",
    phone,
    address_line1: extracted.address_line1?.trim() || null,
    address_line2: null,
    city: extracted.city?.trim() || null,
    region: extracted.region?.trim() || null,
    postal_code: extracted.postal_code?.trim() || null,
    country: /^[A-Z]{2}$/.test(country) ? country : "US",
    timezone: extracted.timezone?.trim() || "America/Chicago",
    website,
    cuisine: extracted.cuisine?.trim() || null,
    tagline: extracted.tagline?.trim() || null,
  };
}

export type WebsiteProfileResult =
  | {
      ok: true;
      profile: TrialProfile;
      weeklyHours: WeeklyHourInput[] | null;
      knowledge: TrialKnowledgeEntry[];
      offersDelivery: boolean;
      fetchedUrls: string[];
    }
  | { ok: false; reason: "fetch_failed" | "not_restaurant" | "parse_failed"; message: string };

export async function buildProfileFromWebsite(
  website: string,
  deps?: { fetchImpl?: FetchFn; extract?: typeof extractRestaurantProfileFromWebsiteText }
): Promise<WebsiteProfileResult> {
  const { text, fetchedUrls, pages } = await collectWebsiteText(website, deps?.fetchImpl ?? fetch);
  if (!text.trim()) {
    return {
      ok: false,
      reason: "fetch_failed",
      message: "We could not open that website. Try the Google Maps link or the name and city instead.",
    };
  }
  try {
    const extract = deps?.extract ?? extractRestaurantProfileFromWebsiteText;
    const { data } = await extract(text, website);
    if (data.is_restaurant === false) {
      return {
        ok: false,
        reason: "not_restaurant",
        message: "That page does not look like a restaurant website. Try the Google Maps link instead.",
      };
    }
    return {
      ok: true,
      profile: profileFromExtracted(data, website),
      weeklyHours: weeklyHoursFromExtracted(data.weekly_hours),
      knowledge: knowledgeFromExtracted(data.faqs),
      offersDelivery: Boolean(data.offers_delivery),
      fetchedUrls,
    };
  } catch (e) {
    console.error("[website profile] LLM extraction failed, using heuristics", e instanceof Error ? e.message.slice(0, 200) : e);
    const heuristic = heuristicProfileFromHtml(pages);
    if (heuristic) {
      return {
        ok: true,
        profile: profileFromExtracted(heuristic, website),
        weeklyHours: weeklyHoursFromExtracted(heuristic.weekly_hours),
        knowledge: [],
        offersDelivery: false,
        fetchedUrls,
      };
    }
    return {
      ok: false,
      reason: "parse_failed",
      message: "We could not read that website right now. Try the Google Maps link or the name and city.",
    };
  }
}
