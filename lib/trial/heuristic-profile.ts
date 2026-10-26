import type { ExtractedRestaurantProfile } from "@/lib/gemini";

/**
 * No-LLM fallback: schema.org JSON-LD (Restaurant / LocalBusiness), Open Graph,
 * <title>, and a phone regex. Used when Gemini is unavailable or fails.
 */

type Json = Record<string, unknown>;

function asRecord(v: unknown): Json | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : null;
}

function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v) && typeof v[0] === "string") return (v[0] as string).trim();
  return undefined;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function extractJsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {
      // ignore malformed blocks
    }
  }
  // Flatten @graph
  const flat: unknown[] = [];
  for (const block of out) {
    const r = asRecord(block);
    if (r && Array.isArray(r["@graph"])) flat.push(...(r["@graph"] as unknown[]));
    else flat.push(block);
  }
  return flat;
}

const BUSINESS_TYPES = /restaurant|localbusiness|foodestablishment|cafe|bar|bakery|fastfood|pizza|organization/i;

function findBusinessNode(blocks: unknown[]): Json | null {
  for (const b of blocks) {
    const r = asRecord(b);
    if (!r) continue;
    const type = r["@type"];
    const types = Array.isArray(type) ? type.map(String) : [String(type ?? "")];
    if (types.some((t) => BUSINESS_TYPES.test(t))) return r;
  }
  return null;
}

const DAY_INDEX: Record<string, number> = {
  su: 0, sunday: 0,
  mo: 1, monday: 1,
  tu: 2, tuesday: 2,
  we: 3, wednesday: 3,
  th: 4, thursday: 4,
  fr: 5, friday: 5,
  sa: 6, saturday: 6,
};

function to24h(value: string): string | null {
  const m = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ?? "00";
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23) return null;
  return `${String(h).padStart(2, "0")}:${min}`;
}

/** schema.org openingHours strings like "Mo-Fr 11:00-22:00" or "Sa,Su 10:00-23:00". */
export function hoursFromOpeningHoursStrings(values: string[]): ExtractedRestaurantProfile["weekly_hours"] {
  const rows = new Map<number, { open: string; close: string }>();
  for (const raw of values) {
    const m = raw.trim().match(/^([A-Za-z,\-\s]+)\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)$/i);
    if (!m) continue;
    const open = to24h(m[2]);
    const close = to24h(m[3]);
    if (!open || !close) continue;
    const dayPart = m[1].replace(/\s+/g, "");
    const days: number[] = [];
    for (const chunk of dayPart.split(",")) {
      const range = chunk.split("-");
      const a = DAY_INDEX[range[0]?.toLowerCase().slice(0, 2) ?? ""];
      const b = range[1] ? DAY_INDEX[range[1].toLowerCase().slice(0, 2)] : a;
      if (a == null || b == null) continue;
      let d = a;
      for (let i = 0; i < 7; i += 1) {
        days.push(d);
        if (d === b) break;
        d = (d + 1) % 7;
      }
    }
    for (const d of days) rows.set(d, { open, close });
  }
  if (rows.size === 0) return [];
  const out: NonNullable<ExtractedRestaurantProfile["weekly_hours"]> = [];
  for (let d = 0; d < 7; d += 1) {
    const r = rows.get(d);
    out.push(r ? { day_of_week: d, is_closed: false, open_time: r.open, close_time: r.close } : { day_of_week: d, is_closed: true });
  }
  return out;
}

function hoursFromSpecification(spec: unknown): ExtractedRestaurantProfile["weekly_hours"] {
  const list = Array.isArray(spec) ? spec : spec ? [spec] : [];
  const strings: string[] = [];
  for (const item of list) {
    const r = asRecord(item);
    if (!r) continue;
    const opens = str(r.opens);
    const closes = str(r.closes);
    const dow = r.dayOfWeek;
    const days = (Array.isArray(dow) ? dow : dow ? [dow] : []).map((d) => String(d).split("/").pop() ?? "").map((d) => d.slice(0, 2));
    if (!opens || !closes || days.length === 0) continue;
    strings.push(`${days.join(",")} ${opens.slice(0, 5)}-${closes.slice(0, 5)}`);
  }
  return hoursFromOpeningHoursStrings(strings);
}

function metaContent(html: string, prop: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i");
  const m = html.match(re) ?? html.match(re2);
  return m?.[1] ? decodeEntities(m[1]) : undefined;
}

function titleFromHtml(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return undefined;
  const raw = decodeEntities(m[1].replace(/\s+/g, " "));
  // "Joe's Pizza | Best pizza in Austin" -> "Joe's Pizza"
  const first = raw.split(/\s*[|\-–—·:]\s*/)[0]?.trim();
  return first && first.length >= 2 && first.length <= 80 ? first : raw.slice(0, 80);
}

const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/;

export function heuristicProfileFromHtml(
  pages: Array<{ url: string; html: string }>
): ExtractedRestaurantProfile | null {
  if (pages.length === 0) return null;
  const allHtml = pages.map((p) => p.html).join("\n");
  const blocks = pages.flatMap((p) => extractJsonLdBlocks(p.html));
  const biz = findBusinessNode(blocks);

  const name =
    str(biz?.name) ??
    metaContent(allHtml, "og:site_name") ??
    metaContent(allHtml, "og:title") ??
    titleFromHtml(pages[0].html);
  if (!name) return null;

  const address = asRecord(biz?.address);
  const phoneRaw = str(biz?.telephone) ?? allHtml.match(PHONE_RE)?.[0];
  const phone = phoneRaw ? phoneRaw.replace(/[^\d+]/g, "").replace(/^(\d{10})$/, "+1$1") : undefined;

  let weekly: ExtractedRestaurantProfile["weekly_hours"] = [];
  if (biz?.openingHoursSpecification) weekly = hoursFromSpecification(biz.openingHoursSpecification);
  if ((!weekly || weekly.length === 0) && biz?.openingHours) {
    const oh = Array.isArray(biz.openingHours) ? biz.openingHours.map(String) : [String(biz.openingHours)];
    weekly = hoursFromOpeningHoursStrings(oh);
  }

  const cuisine = str(biz?.servesCuisine);
  const description = str(biz?.description) ?? metaContent(allHtml, "description");

  return {
    is_restaurant: true,
    name,
    tagline: description?.slice(0, 160),
    cuisine,
    phone,
    address_line1: str(address?.streetAddress),
    city: str(address?.addressLocality),
    region: str(address?.addressRegion),
    postal_code: str(address?.postalCode),
    country: str(address?.addressCountry)?.slice(0, 2).toUpperCase(),
    weekly_hours: weekly ?? [],
    faqs: [],
  };
}
