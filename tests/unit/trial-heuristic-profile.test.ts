import { describe, expect, it } from "vitest";
import {
  extractJsonLdBlocks,
  heuristicProfileFromHtml,
  hoursFromOpeningHoursStrings,
} from "@/lib/trial/heuristic-profile";

const RESTAURANT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Joe's Pizza",
  description: "Wood-fired pizza in downtown Austin.",
  servesCuisine: "Pizza",
  telephone: "(512) 555-0100",
  address: {
    "@type": "PostalAddress",
    streetAddress: "123 Main St",
    addressLocality: "Austin",
    addressRegion: "TX",
    postalCode: "78701",
    addressCountry: "US",
  },
  openingHours: ["Mo-Fr 11:00-22:00", "Sa,Su 10am-11pm"],
};

function pageWithJsonLd(json: unknown): string {
  return `<!doctype html><html><head><title>Joe's Pizza | Best pizza in Austin</title>
<script type="application/ld+json">${JSON.stringify(json)}</script>
</head><body><h1>Welcome</h1></body></html>`;
}

describe("extractJsonLdBlocks", () => {
  it("parses single objects, arrays and @graph, skipping malformed blocks", () => {
    const html = `
      <script type="application/ld+json">{"@type":"WebSite","name":"A"}</script>
      <script type='application/ld+json'>[{"@type":"Organization","name":"B"},{"@type":"Thing"}]</script>
      <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Restaurant","name":"C"}]}</script>
      <script type="application/ld+json">{not json</script>
      <script type="text/javascript">var x = 1;</script>
    `;
    const blocks = extractJsonLdBlocks(html) as Array<Record<string, unknown>>;
    expect(blocks.map((b) => b.name)).toEqual(["A", "B", undefined, "C"]);
  });

  it("returns an empty list when there is no JSON-LD", () => {
    expect(extractJsonLdBlocks("<html><body>hi</body></html>")).toEqual([]);
  });
});

describe("hoursFromOpeningHoursStrings", () => {
  it("expands a weekday range in 24h format", () => {
    const rows = hoursFromOpeningHoursStrings(["Mo-Fr 11:00-22:00"]) ?? [];
    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual({ day_of_week: 0, is_closed: true });
    expect(rows[1]).toEqual({ day_of_week: 1, is_closed: false, open_time: "11:00", close_time: "22:00" });
    expect(rows[5]).toEqual({ day_of_week: 5, is_closed: false, open_time: "11:00", close_time: "22:00" });
    expect(rows[6]).toEqual({ day_of_week: 6, is_closed: true });
  });

  it("expands comma-separated days with am/pm times", () => {
    const rows = hoursFromOpeningHoursStrings(["Sa,Su 10am-11pm"]) ?? [];
    expect(rows[6]).toEqual({ day_of_week: 6, is_closed: false, open_time: "10:00", close_time: "23:00" });
    expect(rows[0]).toEqual({ day_of_week: 0, is_closed: false, open_time: "10:00", close_time: "23:00" });
    expect(rows[1]).toEqual({ day_of_week: 1, is_closed: true });
  });

  it("merges several strings and handles 12am / 12pm", () => {
    const rows = hoursFromOpeningHoursStrings(["Mo-Fr 11:00-22:00", "Sa,Su 12pm-12am"]) ?? [];
    expect(rows[3]).toMatchObject({ open_time: "11:00", close_time: "22:00" });
    expect(rows[6]).toMatchObject({ open_time: "12:00", close_time: "00:00" });
  });

  it("returns an empty array for unparseable input", () => {
    expect(hoursFromOpeningHoursStrings(["open daily", "Mo 25:00-26:00", ""])).toEqual([]);
  });
});

describe("heuristicProfileFromHtml", () => {
  it("builds a profile from a JSON-LD Restaurant node", () => {
    const profile = heuristicProfileFromHtml([
      { url: "https://joespizza.com/", html: pageWithJsonLd(RESTAURANT_JSON_LD) },
    ]);
    expect(profile).not.toBeNull();
    expect(profile).toMatchObject({
      is_restaurant: true,
      name: "Joe's Pizza",
      tagline: "Wood-fired pizza in downtown Austin.",
      cuisine: "Pizza",
      phone: "+15125550100",
      address_line1: "123 Main St",
      city: "Austin",
      region: "TX",
      postal_code: "78701",
      country: "US",
      faqs: [],
    });
    expect(profile?.weekly_hours).toHaveLength(7);
    expect(profile?.weekly_hours?.[1]).toMatchObject({ open_time: "11:00", close_time: "22:00" });
    expect(profile?.weekly_hours?.[0]).toMatchObject({ open_time: "10:00", close_time: "23:00" });
  });

  it("reads openingHoursSpecification when present", () => {
    const profile = heuristicProfileFromHtml([
      {
        url: "https://joespizza.com/",
        html: pageWithJsonLd({
          ...RESTAURANT_JSON_LD,
          openingHours: undefined,
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["https://schema.org/Monday", "Tuesday"],
              opens: "09:00:00",
              closes: "17:00:00",
            },
          ],
        }),
      },
    ]);
    expect(profile?.weekly_hours?.[1]).toMatchObject({ is_closed: false, open_time: "09:00", close_time: "17:00" });
    expect(profile?.weekly_hours?.[2]).toMatchObject({ is_closed: false, open_time: "09:00", close_time: "17:00" });
    expect(profile?.weekly_hours?.[3]).toMatchObject({ is_closed: true });
  });

  it("falls back to og:site_name, meta description and a phone regex when there is no JSON-LD", () => {
    const html = `<html><head>
      <meta property="og:site_name" content="Taco &amp; Co" />
      <meta name="description" content="Street tacos downtown." />
      <title>Home - Taco Co</title>
    </head><body><p>Call us at 512-555-0199 today</p></body></html>`;
    const profile = heuristicProfileFromHtml([{ url: "https://taco.example/", html }]);
    expect(profile).toMatchObject({
      is_restaurant: true,
      name: "Taco & Co",
      tagline: "Street tacos downtown.",
      phone: "+15125550199",
      weekly_hours: [],
    });
    expect(profile?.cuisine).toBeUndefined();
    expect(profile?.address_line1).toBeUndefined();
  });

  it("uses the first segment of <title> when no meta tags exist", () => {
    const html = `<html><head><title>Joe's Pizza | Best pizza in Austin</title></head><body></body></html>`;
    const profile = heuristicProfileFromHtml([{ url: "https://joespizza.com/", html }]);
    expect(profile?.name).toBe("Joe's Pizza");
  });

  it("returns null when there is nothing to name the business", () => {
    expect(heuristicProfileFromHtml([])).toBeNull();
    expect(
      heuristicProfileFromHtml([{ url: "https://x.example/", html: "<html><body><p>hello</p></body></html>" }])
    ).toBeNull();
  });
});
