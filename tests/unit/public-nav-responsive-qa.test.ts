import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("public nav responsive (prompt 05)", () => {
  it("shares drawer panel between marketing and auth headers", () => {
    const drawer = readFileSync(
      join(REPO, "components/landing/public/public-nav-drawer-panel.tsx"),
      "utf8"
    );
    const marketing = readFileSync(
      join(REPO, "components/landing/public/public-marketing-nav.tsx"),
      "utf8"
    );
    const auth = readFileSync(join(REPO, "components/auth/public-auth-header.tsx"), "utf8");

    expect(drawer).toContain('role="dialog"');
    expect(drawer).toContain("public-nav-drawer__close");
    expect(drawer).toContain("public-nav-drawer__head");
    expect(marketing).toContain("PublicNavDrawerPanel");
    expect(auth).toContain("PublicNavDrawerPanel");
  });

  it("uses 900px breakpoint for inline nav and hides drawer on desktop", () => {
    const theme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");
    expect(theme).toMatch(
      /@media \(min-width: 900px\)[\s\S]*\.landing-home \.public-nav-links[\s\S]*display: flex/
    );
    expect(theme).toMatch(
      /@media \(min-width: 900px\)[\s\S]*\.public-nav-menu-btn[\s\S]*display: none/
    );
    expect(theme).toContain("public-nav--open");
    expect(theme).toContain("--public-tap-min");
  });

  it("footer links meet tap height and stack on narrow phones", () => {
    const theme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");
    expect(theme).toMatch(
      /\.public-footer__links a[\s\S]*min-height: 2\.75rem/
    );
    expect(theme).toMatch(
      /@media \(max-width: 519px\)[\s\S]*\.public-footer__links[\s\S]*flex-direction: column/
    );
  });
});
