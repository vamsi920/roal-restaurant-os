import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExtractedRestaurantProfile } from "@/lib/gemini";
import {
  buildProfileFromWebsite,
  collectWebsiteText,
  fetchPageText,
  knowledgeFromExtracted,
  profileFromExtracted,
  weeklyHoursFromExtracted,
} from "@/lib/trial/website-profile";

vi.mock("@/lib/gemini", () => ({
  extractRestaurantProfileFromWebsiteText: vi.fn(async () => {
    throw new Error("real gemini must not be called in unit tests");
  }),
}));

const WEBSITE = "https://joespizza.com/";

const LONG_BODY =
  "<p>Welcome to Joe's Pizza, serving wood-fired pies in downtown Austin since 1998. Open daily for pickup.</p>";

const JSON_LD_HTML = `<!doctype html><html><head>
<title>Joe's Pizza | Austin</title>
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Joe's Pizza",
  servesCuisine: "Pizza",
  telephone: "512-555-0100",
  address: { streetAddress: "123 Main St", addressLocality: "Austin", addressRegion: "TX", postalCode: "78701", addressCountry: "US" },
  openingHours: ["Mo-Fr 11:00-22:00"],
})}</script>
</head><body>${LONG_BODY}</body></html>`;

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

function fetchStub(html: string | null) {
  return vi.fn(async (url: string) => {
    if (html == null) return new Response("nope", { status: 404 });
    return htmlResponse(html);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("weeklyHoursFromExtracted", () => {
  it("returns null for empty input or when no day is open", () => {
    expect(weeklyHoursFromExtracted(undefined)).toBeNull();
    expect(weeklyHoursFromExtracted([])).toBeNull();
    expect(weeklyHoursFromExtracted([{ day_of_week: 1, is_closed: true }])).toBeNull();
    expect(weeklyHoursFromExtracted([{ day_of_week: 1, is_closed: false, open_time: "11:00" }])).toBeNull();
  });

  it("fills missing days as closed and normalizes time strings", () => {
    const rows = weeklyHoursFromExtracted([
      { day_of_week: 1, is_closed: false, open_time: "9:00", close_time: "17:30:00" },
      { day_of_week: 9, is_closed: false, open_time: "09:00", close_time: "17:00" },
      { day_of_week: 2, is_closed: false, open_time: "25:00", close_time: "17:00" },
    ]);
    expect(rows).toHaveLength(7);
    expect(rows?.[1]).toEqual({ day_of_week: 1, is_closed: false, open_time: "09:00", close_time: "17:30" });
    expect(rows?.[2]).toEqual({ day_of_week: 2, is_closed: true, open_time: null, close_time: null });
    expect(rows?.[0]).toEqual({ day_of_week: 0, is_closed: true, open_time: null, close_time: null });
  });
});

describe("knowledgeFromExtracted", () => {
  it("drops blank entries, defaults unknown categories and caps at 8", () => {
    const faqs = [
      { category: "directions", question: "Parking?", answer: "Free lot." },
      { category: "weird", question: "Reservations?", answer: "Walk-in only." },
      { question: "", answer: "ignored" },
      { question: "No answer", answer: " " },
      ...Array.from({ length: 10 }, (_, i) => ({ question: `Q${i}?`, answer: `A${i}` })),
    ];
    const out = knowledgeFromExtracted(faqs);
    expect(out).toHaveLength(8);
    expect(out[0]).toEqual({ category: "directions", question: "Parking?", answer: "Free lot." });
    expect(out[1]).toEqual({ category: "general", question: "Reservations?", answer: "Walk-in only." });
    expect(knowledgeFromExtracted(undefined)).toEqual([]);
  });
});

describe("profileFromExtracted", () => {
  it("normalizes country, phone and fallbacks", () => {
    const profile = profileFromExtracted(
      {
        is_restaurant: true,
        name: "  Joe's Pizza ",
        phone: "+1 (512) 555-0100",
        country: "usa",
        cuisine: " Pizza ",
      },
      WEBSITE
    );
    expect(profile).toMatchObject({
      name: "Joe's Pizza",
      phone: "+1 (512) 555-0100",
      country: "US",
      timezone: "America/Chicago",
      website: WEBSITE,
      cuisine: "Pizza",
      tagline: null,
      address_line1: null,
      address_line2: null,
    });
  });

  it("rejects junk phones and unknown countries", () => {
    const profile = profileFromExtracted(
      { is_restaurant: true, name: "", phone: "call us!", country: "1" },
      WEBSITE
    );
    expect(profile.name).toBe("Your restaurant");
    expect(profile.phone).toBeNull();
    expect(profile.country).toBe("US");
  });
});

describe("fetchPageText / collectWebsiteText", () => {
  it("returns null for non-OK or non-HTML responses and errors", async () => {
    expect(await fetchPageText("https://x.example/", async () => new Response("x", { status: 500 }))).toBeNull();
    expect(
      await fetchPageText(
        "https://x.example/",
        async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } })
      )
    ).toBeNull();
    expect(
      await fetchPageText("https://x.example/", async () => {
        throw new Error("boom");
      })
    ).toBeNull();
    expect(await fetchPageText("https://x.example/", async () => htmlResponse("<p>hi</p>"))).toBe("<p>hi</p>");
  });

  it("collects the homepage plus info pages, skipping failures and short pages", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith("/contact")) return htmlResponse("<p>Call us at 512-555-0100 for catering and large orders anytime.</p>");
      if (url.endsWith("/about")) return htmlResponse("<p>short</p>");
      if (url.endsWith("/hours")) return new Response("x", { status: 404 });
      return htmlResponse(JSON_LD_HTML);
    });
    const result = await collectWebsiteText(WEBSITE, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(result.fetchedUrls).toContain(WEBSITE);
    expect(result.fetchedUrls).toContain("https://joespizza.com/contact");
    expect(result.fetchedUrls).not.toContain("https://joespizza.com/about");
    expect(result.fetchedUrls).not.toContain("https://joespizza.com/hours");
    expect(result.text).toContain("### https://joespizza.com/contact");
    expect(result.text).toContain("wood-fired pies");
    expect(result.pages.find((p) => p.url === WEBSITE)?.html).toBe(JSON_LD_HTML);
  });

  it("returns nothing for an invalid website string", async () => {
    const fetchImpl = vi.fn();
    expect(await collectWebsiteText("not a url", fetchImpl)).toEqual({ text: "", fetchedUrls: [], pages: [] });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("buildProfileFromWebsite", () => {
  it("returns a full profile from the LLM extraction", async () => {
    const extracted: ExtractedRestaurantProfile = {
      is_restaurant: true,
      name: "Joe's Pizza",
      cuisine: "Pizza",
      phone: "+15125550100",
      city: "Austin",
      region: "TX",
      timezone: "America/Chicago",
      offers_delivery: true,
      weekly_hours: [{ day_of_week: 1, is_closed: false, open_time: "11:00", close_time: "22:00" }],
      faqs: [{ category: "policies", question: "Do you take reservations?", answer: "Walk-in only." }],
    };
    const extract = vi.fn(async () => ({ data: extracted }));
    const result = await buildProfileFromWebsite(WEBSITE, {
      fetchImpl: fetchStub(`<html><head><title>Joe's</title></head><body>${LONG_BODY}</body></html>`),
      extract: extract as never,
    });
    expect(extract).toHaveBeenCalledTimes(1);
    expect(extract.mock.calls[0][1]).toBe(WEBSITE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile).toMatchObject({ name: "Joe's Pizza", cuisine: "Pizza", city: "Austin", website: WEBSITE });
    expect(result.weeklyHours?.[1]).toMatchObject({ open_time: "11:00", close_time: "22:00" });
    expect(result.knowledge).toEqual([
      { category: "policies", question: "Do you take reservations?", answer: "Walk-in only." },
    ]);
    expect(result.offersDelivery).toBe(true);
    expect(result.fetchedUrls).toContain(WEBSITE);
  });

  it("returns not_restaurant when the extraction says so", async () => {
    const result = await buildProfileFromWebsite(WEBSITE, {
      fetchImpl: fetchStub(`<html><body>${LONG_BODY}</body></html>`),
      extract: vi.fn(async () => ({ data: { is_restaurant: false, name: "Acme Plumbing" } })) as never,
    });
    expect(result).toMatchObject({ ok: false, reason: "not_restaurant" });
  });

  it("returns fetch_failed when no page could be read", async () => {
    const extract = vi.fn();
    const result = await buildProfileFromWebsite(WEBSITE, { fetchImpl: fetchStub(null), extract: extract as never });
    expect(result).toMatchObject({ ok: false, reason: "fetch_failed" });
    expect(extract).not.toHaveBeenCalled();
  });

  it("falls back to JSON-LD heuristics when the extraction throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await buildProfileFromWebsite(WEBSITE, {
      fetchImpl: fetchStub(JSON_LD_HTML),
      extract: vi.fn(async () => {
        throw new Error("gemini quota exceeded");
      }) as never,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile).toMatchObject({
      name: "Joe's Pizza",
      cuisine: "Pizza",
      phone: "+15125550100",
      address_line1: "123 Main St",
      city: "Austin",
      region: "TX",
      postal_code: "78701",
      country: "US",
    });
    expect(result.weeklyHours?.[1]).toMatchObject({ is_closed: false, open_time: "11:00", close_time: "22:00" });
    expect(result.weeklyHours?.[0]).toMatchObject({ is_closed: true });
    expect(result.knowledge).toEqual([]);
    expect(result.offersDelivery).toBe(false);
  });

  it("returns parse_failed when the extraction throws and heuristics find nothing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await buildProfileFromWebsite(WEBSITE, {
      fetchImpl: fetchStub(`<html><body>${LONG_BODY}</body></html>`),
      extract: vi.fn(async () => {
        throw new Error("gemini down");
      }) as never,
    });
    expect(result).toMatchObject({ ok: false, reason: "parse_failed" });
  });
});
