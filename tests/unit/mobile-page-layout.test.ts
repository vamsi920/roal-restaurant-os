import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

const ROUTE_MARKERS = [
  { route: "/", file: "app/page.tsx" },
  { route: "/pricing", file: "app/pricing/page.tsx" },
  { route: "/blog", file: "app/blog/page.tsx" },
  { route: "/blog/article", file: "app/blog/[slug]/page.tsx" },
  { route: "/about", file: "app/about/page.tsx" },
  { route: "/demo", file: "app/demo/page.tsx" },
  { route: "/contact", file: "app/contact/page.tsx" },
  { route: "/login", file: "app/(auth)/login/page.tsx" },
  { route: "/signup", file: "app/(auth)/signup/page.tsx" },
] as const;

const PROMPT_56_MARKERS = [
  "--public-surface-bg",
  "--public-surface-border",
  "--public-card-padding",
] as const;

const PROMPT_54_MARKERS = [
  "public-about-pillars__body",
  "blog-post-meta__detail",
  "public-contact-field__input",
  "public-demo-hero__deck",
  "public-pricing-orders__examples",
] as const;

const PROMPT_62_PRICING_MOBILE_MARKERS = [
  "public-pricing-orders__examples",
  "public-pricing-pilot__note",
  "public-pricing-faq.landing-section",
  "public-pricing-primary-card__ctas",
] as const;

describe("mobile page layout QA", () => {
  it("public-mobile-pages.css is wired and targets key surfaces", () => {
    const theme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");
    const mobile = readFileSync(join(REPO, "app/public-mobile-pages.css"), "utf8");

    expect(theme).toContain('@import "./public-mobile-pages.css"');
    expect(mobile).toContain("@media (max-width: 479px)");
    expect(mobile).toContain("overflow-wrap: anywhere");
    expect(mobile).toContain(".public-signup-entry__grid");
    expect(mobile).toContain(".success-pricing-visual__footer");
    expect(mobile).toContain(".blog-category-filter");
    for (const marker of PROMPT_56_MARKERS) {
      expect(theme).toContain(marker);
    }
    for (const marker of PROMPT_54_MARKERS) {
      expect(mobile).toContain(marker);
    }
    for (const marker of PROMPT_62_PRICING_MOBILE_MARKERS) {
      expect(mobile).toContain(marker);
    }
    expect(mobile).not.toMatch(
      /\.public-pricing-page__orders[\s\S]*display:\s*none/
    );
    expect(mobile).toContain("@media (max-width: 767px)");
  });

  it("launch routes exist", () => {
    for (const { file } of ROUTE_MARKERS) {
      expect(() => readFileSync(join(REPO, file), "utf8")).not.toThrow();
    }
  });

  it("marketing shell clips horizontal overflow", () => {
    const shell = readFileSync(
      join(REPO, "components/landing/public/public-page-shell.tsx"),
      "utf8"
    );
    expect(shell).toContain("overflow-x-clip");
    expect(shell).toContain("min-w-0");
  });
});
