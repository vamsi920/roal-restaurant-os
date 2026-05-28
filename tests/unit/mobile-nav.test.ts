import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("mobile nav QA", () => {
  it("marketing + auth nav share drawer hook and a11y markup", () => {
    const hook = readFileSync(join(REPO, "lib/landing/use-public-nav-menu.ts"), "utf8");
    const marketing = readFileSync(
      join(REPO, "components/landing/public/public-marketing-nav.tsx"),
      "utf8"
    );
    const auth = readFileSync(join(REPO, "components/auth/public-auth-header.tsx"), "utf8");
    const theme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");

    expect(hook).toContain("lockBodyScroll");
    expect(hook).toContain("public-nav-menu-open");
    expect(hook).toContain("Tab");
    expect(hook).toContain("Escape");

    expect(marketing).toContain("PublicNavDrawerPanel");
    expect(marketing).toContain("public-nav--open");
    expect(marketing).toContain("aria-haspopup");

    expect(auth).toContain("usePublicNavMenu");
    expect(auth).toContain("PublicNavDrawerPanel");

    expect(theme).toContain("html.public-nav-menu-open");
    expect(theme).toContain("overscroll-behavior: contain");
    expect(theme).toContain(".public-theme .public-nav-drawer");
    expect(theme).toContain("public-nav-drawer__nav");
    expect(theme).toContain("public-nav-drawer__close");
    expect(theme).toContain("min-height: 3rem");
    expect(theme).toMatch(/@media \(min-width: 900px\)[\s\S]*\.public-nav-links[\s\S]*display: flex/);
    expect(theme).toMatch(/@media \(min-width: 900px\)[\s\S]*\.public-nav-menu-btn[\s\S]*display: none/);
  });

  it("thin nav wrappers delegate to PublicMarketingNav", () => {
    const landing = readFileSync(join(REPO, "components/landing/landing-nav.tsx"), "utf8");
    const home = readFileSync(
      join(REPO, "components/landing/home/landing-home-nav.tsx"),
      "utf8"
    );
    expect(landing).toContain("PublicMarketingNav");
    expect(home).toContain("PublicMarketingNav");
  });
});
