import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase/admin", () => ({
  isFirebaseAdminConfigured: () => false,
  adminDb: () => {
    throw new Error("not used in memory mode");
  },
  adminAuth: () => {
    throw new Error("not used in memory mode");
  },
}));

import {
  __resetMemoryStats,
  classifySource,
  dayKey,
  isBot,
  loadDailyStats,
  normalizePath,
  recordPageView,
  recordSiteEvent,
} from "@/lib/analytics/site-stats";

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const NOW = new Date("2026-11-19T15:00:00Z");

describe("site stats helpers", () => {
  it("classifies sources", () => {
    expect(classifySource({ utmSource: "meta" })).toBe("Meta ads");
    expect(classifySource({ referrer: "https://www.google.com/" })).toBe("Google");
    expect(classifySource({ referrer: "https://chatgpt.com/c/abc" })).toBe("ChatGPT");
    expect(classifySource({ referrer: null })).toBe("Direct");
    expect(classifySource({ referrer: "https://tryroal.com/pricing", ownHost: "tryroal.com" })).toBeNull();
    expect(classifySource({ referrer: "https://news.example.org/x" })).toBe("news.example.org");
  });

  it("filters bots and normalizes paths", () => {
    expect(isBot("Googlebot/2.1")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("")).toBe(true);
    expect(isBot(CHROME)).toBe(false);
    expect(normalizePath("/blog/post/?x=1#top")).toBe("/blog/post");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("https://evil.com")).toBeNull();
  });

  it("uses New York days", () => {
    expect(dayKey(new Date("2026-11-20T03:00:00Z"))).toBe("2026-11-19");
  });
});

describe("recordPageView / loadDailyStats (memory)", () => {
  beforeEach(() => __resetMemoryStats());

  it("counts views, unique visitors per day, sources and events", async () => {
    const base = { userAgent: CHROME, ip: "1.2.3.4", country: "us", ownHost: "tryroal.com", now: NOW };
    await recordPageView({ ...base, path: "/try", utmSource: "meta", utmCampaign: "awareness_us_owners", referrer: "https://l.facebook.com/" });
    await recordPageView({ ...base, path: "/pricing", referrer: "https://tryroal.com/try" });
    await recordPageView({ ...base, path: "/", userAgent: IPHONE, ip: "5.6.7.8", referrer: "https://www.google.com/" });
    await recordPageView({ ...base, path: "/", userAgent: "Googlebot/2.1" });
    await recordSiteEvent("demos", NOW);

    const [day] = (await loadDailyStats(1, NOW)).slice(-1);
    expect(day.day).toBe("2026-11-19");
    expect(day.views).toBe(3);
    expect(day.visitors).toBe(2);
    expect(day.sources).toEqual({ "Meta ads": 1, Google: 1 });
    expect(day.campaigns).toEqual({ awareness_us_owners: 1 });
    expect(day.paths).toEqual({ "/try": 1, "/pricing": 1, "/": 1 });
    expect(day.devices).toEqual({ desktop: 1, mobile: 1 });
    expect(day.countries).toEqual({ US: 2 });
    expect(day.events.demos).toBe(1);
  });

  it("returns zero days for gaps, oldest first", async () => {
    const days = await loadDailyStats(3, NOW);
    expect(days.map((d) => d.day)).toEqual(["2026-11-17", "2026-11-18", "2026-11-19"]);
    expect(days.every((d) => d.views === 0)).toBe(true);
  });
});
