import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

/**
 * First-party site stats, stored as one Firestore doc per day (`site_daily_stats/{YYYY-MM-DD}`).
 *
 * No cookies and nothing personal is stored: a "visitor" is a one-way hash of
 * day + IP + user agent, kept only to count uniques for that day
 * (`site_daily_visitors/{day}__{hash}`). Days are in America/New_York.
 */

export type SiteEventName = "demos" | "leads";

export type DailyStats = {
  day: string;
  views: number;
  visitors: number;
  events: Partial<Record<SiteEventName, number>>;
  paths: Record<string, number>;
  sources: Record<string, number>;
  campaigns: Record<string, number>;
  countries: Record<string, number>;
  devices: Record<string, number>;
};

const STATS = "site_daily_stats";
const VISITORS = "site_daily_visitors";
const TZ = "America/New_York";

const BOT_RE =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|httpclient|scrapy|vercel|netlify/i;

export function dayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return BOT_RE.test(userAgent);
}

/** Map keys: short, no control characters, never empty. */
function key(raw: string, max = 80): string {
  const k = raw.replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);
  return k || "(none)";
}

export function normalizePath(raw: string): string | null {
  if (!raw || raw[0] !== "/") return null;
  const path = raw.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return key(path, 120);
}

const SOURCE_HOSTS: Array<[RegExp, string]> = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, "ChatGPT"],
  [/(^|\.)perplexity\.ai$/, "Perplexity"],
  [/(^|\.)(claude\.ai|anthropic\.com)$/, "Claude"],
  [/(^|\.)gemini\.google\.com$/, "Gemini"],
  [/(^|\.)(facebook\.com|fb\.com|instagram\.com|l\.facebook\.com|lm\.facebook\.com)$/, "Facebook/Instagram"],
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
  [/(^|\.)reddit\.com$/, "Reddit"],
  [/(^|\.)(x\.com|t\.co|twitter\.com)$/, "X"],
  [/(^|\.)youtube\.com$/, "YouTube"],
];

/**
 * Where a landing came from: utm_source wins, else the referrer host.
 * Returns null for internal navigation (referrer is our own site).
 */
export function classifySource(input: { utmSource?: string | null; referrer?: string | null; ownHost?: string | null }): string | null {
  const utm = input.utmSource?.trim().toLowerCase();
  if (utm) {
    if (utm === "meta" || utm === "facebook" || utm === "fb" || utm === "instagram" || utm === "ig") return "Meta ads";
    if (utm === "email" || utm === "outreach") return "Email";
    return key(`utm: ${utm}`, 40);
  }
  if (!input.referrer) return "Direct";
  let host: string;
  try {
    host = new URL(input.referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "Direct";
  }
  const own = input.ownHost?.toLowerCase().replace(/^www\./, "");
  if (own && (host === own || host.endsWith(`.${own}`))) return null;
  for (const [re, label] of SOURCE_HOSTS) if (re.test(host)) return label;
  return key(host, 60);
}

export function deviceOf(userAgent: string): "mobile" | "desktop" {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent) ? "mobile" : "desktop";
}

function visitorHash(day: string, ip: string, userAgent: string): string {
  const salt = process.env.SITE_STATS_SALT || process.env.FIREBASE_SERVICE_ACCOUNT?.slice(0, 64) || "roal";
  return createHash("sha256").update(`${salt}|${day}|${ip}|${userAgent}`).digest("hex").slice(0, 20);
}

// ---- storage ---------------------------------------------------------------

// Demo mode only. Kept on globalThis so route handlers and pages (separate module
// instances in dev) share one store.
const g = globalThis as unknown as { __roalSiteStats?: { days: Map<string, DailyStats>; visitors: Set<string> } };
g.__roalSiteStats ??= { days: new Map(), visitors: new Set() };
const memory = g.__roalSiteStats.days;
const memoryVisitors = g.__roalSiteStats.visitors;

function emptyDay(day: string): DailyStats {
  return { day, views: 0, visitors: 0, events: {}, paths: {}, sources: {}, campaigns: {}, countries: {}, devices: {} };
}

function bumpMemory(day: string, patch: (d: DailyStats) => void): void {
  const d = memory.get(day) ?? emptyDay(day);
  patch(d);
  memory.set(day, d);
}

function inc(map: Record<string, number>, k: string, by = 1): void {
  map[k] = (map[k] ?? 0) + by;
}

export type PageViewInput = {
  path: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  userAgent: string;
  ip: string;
  country?: string | null;
  ownHost?: string | null;
  now?: Date;
};

/** Count one page view. Silently ignores bots and private paths (caller checks paths too). */
export async function recordPageView(input: PageViewInput): Promise<void> {
  if (isBot(input.userAgent)) return;
  const path = normalizePath(input.path);
  if (!path) return;
  const day = dayKey(input.now);
  const source = classifySource({ utmSource: input.utmSource, referrer: input.referrer, ownHost: input.ownHost });
  const campaign = input.utmCampaign?.trim() ? key(input.utmCampaign, 60) : null;
  const country = key((input.country || "??").toUpperCase(), 4);
  const device = deviceOf(input.userAgent);
  const visitorId = `${day}__${visitorHash(day, input.ip, input.userAgent)}`;

  if (!isFirebaseAdminConfigured()) {
    const isNew = !memoryVisitors.has(visitorId);
    memoryVisitors.add(visitorId);
    bumpMemory(day, (d) => {
      d.views += 1;
      inc(d.paths, path);
      if (source) inc(d.sources, source);
      if (campaign) inc(d.campaigns, campaign);
      if (isNew) {
        d.visitors += 1;
        inc(d.countries, country);
        inc(d.devices, device);
      }
    });
    return;
  }

  const db = adminDb();
  let isNew = false;
  try {
    await db.collection(VISITORS).doc(visitorId).create({ day });
    isNew = true;
  } catch {
    isNew = false; // already counted today
  }
  const one = FieldValue.increment(1);
  const update: Record<string, unknown> = {
    day,
    views: one,
    paths: { [path]: one },
    updated_at: new Date().toISOString(),
  };
  if (source) update.sources = { [source]: one };
  if (campaign) update.campaigns = { [campaign]: one };
  if (isNew) {
    update.visitors = one;
    update.countries = { [country]: one };
    update.devices = { [device]: one };
  }
  await db.collection(STATS).doc(day).set(update, { merge: true });
}

/** Count a funnel event (demo started, lead captured) for today. Never throws. */
export async function recordSiteEvent(name: SiteEventName, now: Date = new Date()): Promise<void> {
  const day = dayKey(now);
  try {
    if (!isFirebaseAdminConfigured()) {
      bumpMemory(day, (d) => {
        d.events[name] = (d.events[name] ?? 0) + 1;
      });
      return;
    }
    await adminDb()
      .collection(STATS)
      .doc(day)
      .set({ day, events: { [name]: FieldValue.increment(1) } }, { merge: true });
  } catch {
    // Stats must never break the product.
  }
}

function asDaily(day: string, raw: Record<string, unknown> | undefined): DailyStats {
  if (!raw) return emptyDay(day);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const map = (v: unknown): Record<string, number> => {
    const out: Record<string, number> = {};
    if (v && typeof v === "object") for (const [k, n] of Object.entries(v as Record<string, unknown>)) out[k] = num(n);
    return out;
  };
  return {
    day,
    views: num(raw.views),
    visitors: num(raw.visitors),
    events: map(raw.events) as DailyStats["events"],
    paths: map(raw.paths),
    sources: map(raw.sources),
    campaigns: map(raw.campaigns),
    countries: map(raw.countries),
    devices: map(raw.devices),
  };
}

/** Last `days` days, oldest first, today last. Missing days come back as zeros. */
export async function loadDailyStats(days: number, now: Date = new Date()): Promise<DailyStats[]> {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) keys.push(dayKey(new Date(now.getTime() - i * 864e5)));
  const unique = [...new Set(keys)];
  if (!isFirebaseAdminConfigured()) return unique.map((k) => memory.get(k) ?? emptyDay(k));
  const db = adminDb();
  const snaps = await db.getAll(...unique.map((k) => db.collection(STATS).doc(k)));
  return snaps.map((s, i) => asDaily(unique[i], s.exists ? (s.data() as Record<string, unknown>) : undefined));
}

/** Test helper. */
export function __resetMemoryStats(): void {
  memory.clear();
  memoryVisitors.clear();
}
