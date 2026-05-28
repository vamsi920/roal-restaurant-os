import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("legal pages responsive (prompt 14)", () => {
  it("imports legal-pages.css on privacy, terms, and security routes", () => {
    expect(read("app/privacy/page.tsx")).toContain('import "@/app/legal-pages.css"');
    expect(read("app/terms/page.tsx")).toContain('import "@/app/legal-pages.css"');
    expect(read("app/security/page.tsx")).toContain('import "@/app/legal-pages.css"');
  });

  it("clips overflow and exposes in-page jump links", () => {
    const legal = read("components/landing/legal/legal-page-content.tsx");
    const security = read("components/landing/security/security-page-content.tsx");

    expect(legal).toContain("overflow-x-clip");
    expect(legal).toContain('href="#legal-policy-body"');
    expect(legal).toContain('id="legal-contact"');
    expect(security).toContain("overflow-x-clip");
    expect(security).toContain("public-page-jump-nav");
    expect(security).toContain("copy.faq.titleId");
  });

  it("styles readable measure, scroll margin, and phone layouts", () => {
    const css = read("app/legal-pages.css");
    expect(css).toContain("Legal pages responsive (prompt 14)");
    expect(css).toContain("--public-readable-max");
    expect(css).toContain("#legal-policy-body");
    expect(css).toContain("scroll-margin-top:");
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-legal-panel__body[\s\S]*gap:\s*1\.25rem/
    );
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-security-tech[\s\S]*grid-template-columns:\s*1fr/
    );
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-security-hero \.public-cta-band__actions[\s\S]*flex-direction:\s*column/
    );
  });

  it("keeps legal copy draft-labeled (real-data discipline)", () => {
    const copy = read("lib/landing/legal-page-copy.ts");
    expect(copy).toContain("draft");
    expect(copy).toContain("placeholder");
  });
});
