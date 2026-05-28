import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LANDING_FOOTER } from "@/lib/landing/footer-copy";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("footer responsive (prompt 15)", () => {
  it("keeps essential links minimal (no duplicate contact row)", () => {
    const labels = LANDING_FOOTER.essentialLinks.map((l) => l.label);
    expect(labels).toEqual(["Pricing", "Demo", "Privacy", "Terms"]);
    expect(labels).not.toContain("Contact");
    expect(LANDING_FOOTER.contactCta.href).toBe("/contact");
    expect(LANDING_FOOTER.demoCta.href).toBe("/demo");
  });

  it("imports footer-pages.css and clips overflow on the shell", () => {
    const footer = read("components/landing/public-footer.tsx");
    expect(footer).toContain('import "@/app/footer-pages.css"');
    expect(footer).toContain("overflow-x-clip");
    expect(footer).toContain('aria-label="Get started"');
  });

  it("styles phone grid links and tablet/desktop column layout", () => {
    const css = read("app/footer-pages.css");
    expect(css).toContain("Footer responsive (prompt 15)");
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-footer__cta[\s\S]*width:\s*100%/
    );
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-footer__links[\s\S]*grid-template-columns:\s*repeat\(2/
    );
    expect(css).toMatch(
      /@media \(min-width: 768px\)[\s\S]*grid-template-areas[\s\S]*"brand ctas"/
    );
    expect(css).toMatch(
      /@media \(min-width: 1024px\)[\s\S]*"brand nav ctas"/
    );
  });
});
