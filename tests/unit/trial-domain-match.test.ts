import { describe, expect, it } from "vitest";
import { domainLabel, placeMatchesDomain } from "@/lib/trial/pipeline";

describe("website fallback to Google", () => {
  it("reads the name part of the domain", () => {
    expect(domainLabel("https://www.dosahutnewjersey.com/")).toBe("dosahutnewjersey");
    expect(domainLabel("not a url")).toBeNull();
  });

  it("accepts the same business and rejects a different one", () => {
    expect(placeMatchesDomain("Dosa Hut", "dosahutnewjersey")).toBe(true);
    expect(placeMatchesDomain("Dosa Hut - Jersey City", "dosahutnewjersey")).toBe(true);
    expect(placeMatchesDomain("Joe's Pizza", "joespizzanyc")).toBe(true);
    expect(placeMatchesDomain("Saravana Bhavan", "dosahutnewjersey")).toBe(false);
  });
});

describe("lookupWithoutListing", () => {
  it("uses what the web search found", async () => {
    const { lookupWithoutListing } = await import("@/lib/trial/pipeline");
    const out = await lookupWithoutListing({ kind: "website", url: "https://www.dosahutnewjersey.com/" }, async () => ({
      is_restaurant: true,
      name: "Dosa Hut",
      city: "Jersey City",
      address_line1: "777 Newark Ave",
    }));
    expect(out.profile).toMatchObject({ name: "Dosa Hut", city: "Jersey City", website: "https://www.dosahutnewjersey.com/" });
  });

  it("never fails: falls back to the domain or typed name", async () => {
    const { lookupWithoutListing } = await import("@/lib/trial/pipeline");
    const none = async () => null;
    const site = await lookupWithoutListing({ kind: "website", url: "https://www.dosa-hut.com/" }, none);
    expect(site.profile.name).toBe("Dosa Hut");
    const typed = await lookupWithoutListing({ kind: "name_city", name: "Tiny Cafe", city: "Hoboken" }, async () => {
      throw new Error("search down");
    });
    expect(typed.profile).toMatchObject({ name: "Tiny Cafe", city: "Hoboken" });
  });
});
