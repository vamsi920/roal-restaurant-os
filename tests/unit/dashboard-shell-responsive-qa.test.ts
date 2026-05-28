import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("dashboard shell responsive (prompt 19)", () => {
  it("uses mobile drawer hook with focus trap and inert main", () => {
    const shell = read("components/dashboard/app-shell.tsx");
    const hook = read("lib/dashboard/use-app-shell-nav.ts");

    expect(shell).toContain("useAppShellNav");
    expect(shell).toContain("inert: true");
    expect(shell).toContain("app-shell-backdrop");
    expect(shell).toContain('role={mobileOpen ? "dialog" : undefined}');
    expect(hook).toContain("app-shell-nav-open");
    expect(hook).toContain('event.key === "Escape"');
    expect(hook).toContain('event.key !== "Tab"');
  });

  it("closes drawer on route change and exposes skip link", () => {
    const shell = read("components/dashboard/app-shell.tsx");
    expect(shell).toContain("closeMenu");
    expect(shell).toContain("[pathname, closeMenu]");
    expect(shell).toContain("app-shell-skip");
    expect(shell).toContain('id="app-main-content"');
  });

  it("styles safe-area, backdrop, and account actions on small viewports", () => {
    const css = read("app/dashboard-theme.css");
    expect(css).toContain("Dashboard shell responsive (prompt 19)");
    expect(css).toContain("app-shell-nav-open");
    expect(css).toContain("app-shell-sidebar__footer");
    expect(css).toMatch(
      /@media \(max-width: 1023px\)[\s\S]*\.app-shell-main[\s\S]*safe-area-inset-bottom/
    );
    expect(css).toContain(".app-shell-signout");
  });

  it("does not change sign-out auth route", () => {
    const shell = read("components/dashboard/app-shell.tsx");
    expect(shell).toContain('action="/auth/signout"');
    expect(shell).toContain('method="post"');
  });
});
