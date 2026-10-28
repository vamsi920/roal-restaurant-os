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
