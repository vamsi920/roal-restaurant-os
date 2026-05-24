import type { AnalyticsRangeKey } from "@/lib/analytics/types";

const RANGE_DAYS: Record<AnalyticsRangeKey, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function parseAnalyticsRangeKey(
  raw: string | string[] | undefined
): AnalyticsRangeKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "7d" || value === "30d" || value === "90d") return value;
  return "30d";
}

export function analyticsRangeBounds(key: AnalyticsRangeKey): {
  since: Date;
  until: Date;
  days: number;
} {
  const days = RANGE_DAYS[key];
  const until = new Date();
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);
  return { since, until, days };
}

export function dayKeyUtc(iso: string): string {
  return iso.slice(0, 10);
}

export function buildDaySeries(
  since: Date,
  until: Date
): string[] {
  const keys: string[] = [];
  const cursor = new Date(
    Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate())
  );
  const end = new Date(
    Date.UTC(until.getUTCFullYear(), until.getUTCMonth(), until.getUTCDate())
  );
  while (cursor <= end) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}
