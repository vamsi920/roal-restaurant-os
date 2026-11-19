import type { Db } from "@/lib/db";
import { adminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { dayKey, loadDailyStats, type DailyStats } from "@/lib/analytics/site-stats";

export type Totals = {
  visitors: number;
  views: number;
  adVisits: number;
  demos: number;
  leads: number;
  signups: number;
  restaurants: number;
  calls: number;
  orders: number;
};

export type DayPoint = Totals & { day: string };

export type RankRow = { label: string; count: number };

export type RecentSignup = { email: string; createdAt: string; lastSignInAt: string | null; provider: string };
export type RecentDemo = {
  createdAt: string;
  restaurantName: string | null;
  sourceInput: string | null;
  status: string;
  callCount: number;
  claimed: boolean;
};
export type RecentRestaurant = { name: string; createdAt: string };

export type GrowthStats = {
  generatedAt: string;
  today: Totals;
  yesterday: Totals;
  last7: Totals;
  last30: Totals;
  allTime: { signups: number; restaurants: number; orders: number; calls: number };
  series: DayPoint[];
  topPages: RankRow[];
  sources: RankRow[];
  campaigns: RankRow[];
  countries: RankRow[];
  devices: RankRow[];
  recentSignups: RecentSignup[];
  recentDemos: RecentDemo[];
  recentRestaurants: RecentRestaurant[];
  notes: string[];
};

const DAYS = 30;

function zero(): Totals {
  return { visitors: 0, views: 0, adVisits: 0, demos: 0, leads: 0, signups: 0, restaurants: 0, calls: 0, orders: 0 };
}

function add(a: Totals, b: Totals): Totals {
  const out = zero();
  for (const k of Object.keys(out) as Array<keyof Totals>) out[k] = a[k] + b[k];
  return out;
}

function rank(stats: DailyStats[], pick: (d: DailyStats) => Record<string, number>, limit = 10): RankRow[] {
  const sum: Record<string, number> = {};
  for (const d of stats) for (const [k, v] of Object.entries(pick(d))) sum[k] = (sum[k] ?? 0) + v;
  return Object.entries(sum)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function countByDay(rows: Array<{ created_at?: unknown }>, days: Set<string>): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (typeof r.created_at !== "string") continue;
    const d = dayKey(new Date(r.created_at));
    if (days.has(d)) out.set(d, (out.get(d) ?? 0) + 1);
  }
  return out;
}

async function listAuthUsers(): Promise<RecentSignup[]> {
  if (!isFirebaseAdminConfigured()) return [];
  const users: RecentSignup[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 10; i++) {
    const page = await adminAuth().listUsers(1000, pageToken);
    for (const u of page.users) {
      users.push({
        email: u.email ?? "(no email)",
        createdAt: new Date(u.metadata.creationTime).toISOString(),
        lastSignInAt: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).toISOString() : null,
        provider: u.providerData[0]?.providerId ?? "password",
      });
    }
    pageToken = page.pageToken;
    if (!pageToken) break;
  }
  return users.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Everything on /dashboard/admin/stats. Platform-admin only (caller checks). */
export async function loadGrowthStats(db: Db, now: Date = new Date()): Promise<GrowthStats> {
  const notes: string[] = [];
  const daily = await loadDailyStats(DAYS, now);
  const daySet = new Set(daily.map((d) => d.day));

  const [restaurants, calls, orders, trials, users] = await Promise.all([
    db.from("restaurants").select("name, created_at"),
    db.from("agent_call_events").select("created_at"),
    db.from("phone_order_receipts").select("created_at"),
    db.from("agent_trials").select("created_at, restaurant_name, source_input, status, call_count, claimed_restaurant_id"),
    listAuthUsers().catch((e: unknown) => {
      notes.push(`Could not list sign-ups: ${e instanceof Error ? e.message : String(e)}`);
      return [] as RecentSignup[];
    }),
  ]);

  const restaurantRows = (restaurants.data ?? []) as Array<{ name?: string; created_at?: string }>;
  const callRows = (calls.data ?? []) as Array<{ created_at?: string }>;
  const orderRows = (orders.data ?? []) as Array<{ created_at?: string }>;
  const trialRows = (trials.data ?? []) as Array<Record<string, unknown>>;

  const restaurantsByDay = countByDay(restaurantRows, daySet);
  const callsByDay = countByDay(callRows, daySet);
  const ordersByDay = countByDay(orderRows, daySet);
  const signupsByDay = countByDay(users.map((u) => ({ created_at: u.createdAt })), daySet);

  const series: DayPoint[] = daily.map((d) => ({
    day: d.day,
    visitors: d.visitors,
    views: d.views,
    adVisits: d.sources["Meta ads"] ?? 0,
    demos: d.events.demos ?? 0,
    leads: d.events.leads ?? 0,
    signups: signupsByDay.get(d.day) ?? 0,
    restaurants: restaurantsByDay.get(d.day) ?? 0,
    calls: callsByDay.get(d.day) ?? 0,
    orders: ordersByDay.get(d.day) ?? 0,
  }));

  const sumLast = (n: number) => series.slice(-n).reduce((acc, p) => add(acc, p), zero());
  const today = series[series.length - 1] ?? { ...zero(), day: dayKey(now) };
  const yesterday = series[series.length - 2] ?? { ...zero(), day: "" };

  if (daily.every((d) => d.views === 0)) {
    notes.push("Visit counting started on 2026-11-19, so earlier days show zero visitors.");
  }

  const last7Stats = daily.slice(-7);

  return {
    generatedAt: now.toISOString(),
    today: stripDay(today),
    yesterday: stripDay(yesterday),
    last7: sumLast(7),
    last30: sumLast(DAYS),
    allTime: {
      signups: users.length,
      restaurants: restaurantRows.length,
      orders: orderRows.length,
      calls: callRows.length,
    },
    series,
    topPages: rank(last7Stats, (d) => d.paths, 12),
    sources: rank(last7Stats, (d) => d.sources, 10),
    campaigns: rank(daily, (d) => d.campaigns, 8),
    countries: rank(last7Stats, (d) => d.countries, 8),
    devices: rank(last7Stats, (d) => d.devices, 3),
    recentSignups: users.slice(0, 15),
    recentDemos: trialRows
      .filter((t) => typeof t.created_at === "string")
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 15)
      .map((t) => ({
        createdAt: String(t.created_at),
        restaurantName: typeof t.restaurant_name === "string" ? t.restaurant_name : null,
        sourceInput: typeof t.source_input === "string" ? t.source_input : null,
        status: typeof t.status === "string" ? t.status : "unknown",
        callCount: typeof t.call_count === "number" ? t.call_count : 0,
        claimed: Boolean(t.claimed_restaurant_id),
      })),
    recentRestaurants: restaurantRows
      .filter((r) => typeof r.created_at === "string")
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 10)
      .map((r) => ({ name: r.name ?? "(unnamed)", createdAt: String(r.created_at) })),
    notes,
  };
}

function stripDay(p: DayPoint | (Totals & { day: string })): Totals {
  const { day: _day, ...rest } = p;
  void _day;
  return rest;
}
