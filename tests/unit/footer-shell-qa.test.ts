import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

const MARKETING_SHELL_PAGES = [
  "app/pricing/page.tsx",
  "app/about/page.tsx",
  "app/blog/page.tsx",
  "app/demo/page.tsx",
  "app/contact/page.tsx",
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
  "app/security/page.tsx",
] as const;

describe("footer shell coverage (prompt 52)", () => {
  it("marketing shell renders PublicFooter", () => {
    const shell = readFileSync(
      join(REPO, "components/landing/public/public-page-shell.tsx"),
      "utf8"
    );
    expect(shell).toContain("MarketingFooter");
    const footer = readFileSync(join(REPO, "components/landing/marketing-footer.tsx"), "utf8");
    expect(footer).toContain("PublicFooter");
  });

  it("home route uses landing shell with MarketingFooter", () => {
    expect(readFileSync(join(REPO, "app/page.tsx"), "utf8")).toContain("LandingPage");
    expect(readFileSync(join(REPO, "components/landing/landing-page.tsx"), "utf8")).toContain(
      "LandingHomeShell"
    );
    expect(
      readFileSync(join(REPO, "components/landing/home/landing-home-shell.tsx"), "utf8")
    ).toContain("MarketingFooter");
  });

  it("blog article route uses marketing shell", () => {
    expect(readFileSync(join(REPO, "app/blog/[slug]/page.tsx"), "utf8")).toContain(
      "BlogArticleLayout"
    );
    expect(readFileSync(join(REPO, "components/blog/blog-article-layout.tsx"), "utf8")).toContain(
      "MarketingShell"
    );
  });

  for (const page of MARKETING_SHELL_PAGES) {
    it(`${page} wraps content in MarketingShell`, () => {
      const path = join(REPO, page);
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, "utf8")).toContain("MarketingShell");
    });
  }
});
