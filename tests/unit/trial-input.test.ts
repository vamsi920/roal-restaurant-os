import { describe, expect, it } from "vitest";
import { mapsQueryFromUrl, parseTrialInput, sourceKindFromParsed } from "@/lib/trial/input";

describe("parseTrialInput", () => {
  it("accepts a website URL with a scheme", () => {
    const parsed = parseTrialInput("https://joespizza.com/menu");
    expect(parsed).toEqual({ kind: "website", url: "https://joespizza.com/menu" });
  });

  it("adds https:// to a bare domain", () => {
    const parsed = parseTrialInput("joespizza.com");
    expect(parsed).toEqual({ kind: "website", url: "https://joespizza.com/" });
  });

  it("trims whitespace around a URL", () => {
    const parsed = parseTrialInput("   www.joespizza.com/about  ");
    expect(parsed).toEqual({ kind: "website", url: "https://www.joespizza.com/about" });
  });

  it("parses a maps.google.com place URL and extracts the place name", () => {
    const parsed = parseTrialInput(
      "https://maps.google.com/maps/place/Joe's+Pizza/@40.7,-74.0,17z/data=!3m1"
    );
    expect(parsed).toMatchObject({ kind: "maps", query: "Joe's Pizza" });
  });

  it("parses a www.google.com/maps/place URL with percent-encoded name", () => {
    const parsed = parseTrialInput(
      "https://www.google.com/maps/place/Los%20Tacos%20No.%201/@40.7,-74.0,17z"
    );
    expect(parsed).toMatchObject({ kind: "maps", query: "Los Tacos No. 1" });
  });

  it("parses a maps.app.goo.gl short link with a null query", () => {
    const parsed = parseTrialInput("https://maps.app.goo.gl/AbCdEf123");
    expect(parsed).toMatchObject({ kind: "maps", url: "https://maps.app.goo.gl/AbCdEf123", query: null });
  });

  it("uses ?q= as the maps query", () => {
    const parsed = parseTrialInput("https://www.google.com/maps?q=Blue+Bottle+Coffee+Austin");
    expect(parsed).toMatchObject({ kind: "maps", query: "Blue Bottle Coffee Austin" });
  });

  it("splits 'Name, City' into name and city", () => {
    expect(parseTrialInput("Joe's Pizza, Austin TX")).toEqual({
      kind: "name_city",
      name: "Joe's Pizza",
      city: "Austin TX",
    });
  });

  it("splits 'Name in City' into name and city", () => {
    expect(parseTrialInput("Joe's Pizza in Austin")).toEqual({
      kind: "name_city",
      name: "Joe's Pizza",
      city: "Austin",
    });
  });

  it("returns a null city when only a name is given", () => {
    expect(parseTrialInput("Joe's Pizza")).toEqual({
      kind: "name_city",
      name: "Joe's Pizza",
      city: null,
    });
  });

  it("rejects empty and non-string input", () => {
    expect(parseTrialInput("")).toHaveProperty("error");
    expect(parseTrialInput("   ")).toHaveProperty("error");
    expect(parseTrialInput(null)).toHaveProperty("error");
    expect(parseTrialInput(42)).toHaveProperty("error");
    expect(parseTrialInput({ input: "x" })).toHaveProperty("error");
  });

  it("rejects a one-character name", () => {
    expect(parseTrialInput("x")).toHaveProperty("error");
  });

  it("rejects a URL whose host has no dot", () => {
    expect(parseTrialInput("https://localhost")).toHaveProperty("error");
    expect(parseTrialInput("http://intranet/menu")).toHaveProperty("error");
  });

  it("treats a non-http scheme as a plain name rather than a website", () => {
    expect(parseTrialInput("ftp://joespizza.com")).toMatchObject({ kind: "name_city" });
  });

  it("caps input length at 500 characters", () => {
    const long = `${"a".repeat(600)}`;
    const parsed = parseTrialInput(long);
    expect(parsed).toMatchObject({ kind: "name_city" });
    if ("kind" in parsed && parsed.kind === "name_city") {
      expect(parsed.name.length).toBe(500);
    }
  });
});

describe("mapsQueryFromUrl", () => {
  it("prefers ?q= over the path", () => {
    const url = new URL("https://www.google.com/maps/place/Ignored/?q=Preferred+Name");
    expect(mapsQueryFromUrl(url)).toBe("Preferred Name");
  });

  it("falls back to ?query=", () => {
    expect(mapsQueryFromUrl(new URL("https://maps.google.com/?query=Cafe+Lola"))).toBe("Cafe Lola");
  });

  it("returns null when nothing usable is present", () => {
    expect(mapsQueryFromUrl(new URL("https://maps.app.goo.gl/xyz"))).toBeNull();
  });
});

describe("sourceKindFromParsed", () => {
  it("mirrors the parsed kind", () => {
    expect(sourceKindFromParsed({ kind: "website", url: "https://a.com/" })).toBe("website");
    expect(sourceKindFromParsed({ kind: "maps", url: "https://maps.google.com/", query: null })).toBe("maps");
    expect(sourceKindFromParsed({ kind: "name_city", name: "A", city: null })).toBe("name_city");
  });
});
