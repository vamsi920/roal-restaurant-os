import { describe, expect, it } from "vitest";
import {
  faqForPage,
  HOME_FAQ,
  PRICING_FAQ,
  SECURITY_FAQ,
} from "@/lib/landing/launch-faq";
import { validatePublicHref } from "@/lib/landing/public-links";

describe("launch FAQ", () => {
  it("exports non-empty slices per page that match faqForPage", () => {
    expect(HOME_FAQ.items.length).toBeGreaterThanOrEqual(4);
    expect(PRICING_FAQ.length).toBeGreaterThanOrEqual(3);
    expect(SECURITY_FAQ.length).toBeGreaterThanOrEqual(3);
    expect(HOME_FAQ.items).toEqual(faqForPage("home"));
    expect(PRICING_FAQ).toEqual(faqForPage("pricing"));
    expect(SECURITY_FAQ).toEqual(faqForPage("security"));
    expect(HOME_FAQ.titleId).toBe("home-faq-heading");
  });

  it("every entry is tagged with the page it is served on", () => {
    for (const page of ["home", "pricing", "security"] as const) {
      for (const item of faqForPage(page)) {
        expect(item.pages, item.id).toContain(page);
      }
    }
  });

  it("homepage opens with what the product does and how to start", () => {
    const ids = HOME_FAQ.items.map((i) => i.id);
    expect(ids[0]).toBe("home-what");
    expect(ids).toContain("home-setup");
    expect(ids).toContain("home-handoff");
  });

  it("keeps questions short and plain", () => {
    const all = [...faqForPage("home"), ...faqForPage("pricing"), ...faqForPage("security")];
    for (const item of all) {
      expect(item.question.length, item.id).toBeLessThanOrEqual(64);
      expect(item.answer.length, item.id).toBeLessThanOrEqual(260);
      expect(item.answer, item.id).not.toMatch(/enterprise|integration/i);
      expect(item.question.trim().endsWith("?"), item.id).toBe(true);
    }
  });

  it("uses unique ids across all entries", () => {
    const items = [...faqForPage("home"), ...faqForPage("pricing"), ...faqForPage("security")];
    const ids = [...new Set(items.map((i) => i.id))];
    expect(ids.length).toBe(new Set(ids).size);
    for (const id of ids) {
      expect(items.filter((i) => i.id === id).every((i) => i === items.find((x) => x.id === id))).toBe(true);
    }
  });

  it("menu-change and handoff answers stay honest about live menu and people", () => {
    const menu = HOME_FAQ.items.find((i) => i.id === "home-menu-changes");
    const handoff = HOME_FAQ.items.find((i) => i.id === "home-handoff");
    expect(menu?.answer).toMatch(/sold-out items are not offered/i);
    expect(handoff?.answer).toMatch(/handed to your team/i);
    expect(PRICING_FAQ.some((i) => i.id === "home-menu-changes")).toBe(true);
    expect(SECURITY_FAQ.some((i) => i.id === "home-handoff")).toBe(true);
  });

  it("links resolve to real public routes", () => {
    const all = [...faqForPage("home"), ...faqForPage("pricing"), ...faqForPage("security")];
    const links = all.filter((i) => i.link);
    expect(links.length).toBeGreaterThan(0);
    for (const item of links) {
      expect(validatePublicHref(item.link!.href, { blogSlugs: [] }).ok, item.id).toBe(true);
      expect(item.link!.label.length).toBeGreaterThan(2);
    }
    expect(HOME_FAQ.items.find((i) => i.id === "home-setup")?.link?.href).toBe("/try");
  });

  it("never invents numbers, customers, or vendors", () => {
    const all = [...faqForPage("home"), ...faqForPage("pricing"), ...faqForPage("security")];
    for (const item of all) {
      expect(item.answer, item.id).not.toMatch(/\b\d{2,}% of (restaurants|callers)|guarantee/i);
      expect(item.answer, item.id).not.toMatch(/twilio|elevenlabs|openai|gemini|supabase/i);
    }
  });
});
