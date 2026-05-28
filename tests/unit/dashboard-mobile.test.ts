import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const THEME = join(REPO, "app/dashboard-theme.css");
const SHELL = join(REPO, "components/dashboard/app-shell.tsx");

describe("dashboard mobile app shell (prompt 45)", () => {
  it("defines sticky safe header and overflow clip", () => {
    const css = readFileSync(THEME, "utf8");
    expect(css).toContain(".app-shell-header");
    expect(css).toContain("safe-area-inset-top");
    expect(css).toContain("overflow-x: clip");
    expect(css).toContain("app-shell-main");
  });

  it("enforces 44px tap targets and card tables on small screens", () => {
    const css = readFileSync(THEME, "utf8");
    expect(css).toContain("min-height: 2.75rem");
    expect(css).toContain(".dashboard-table");
    expect(css).toContain("data-label");
    expect(css).toContain("touch-action: manipulation");
  });

  it("wires shell classes for mobile header and nav", () => {
    const src = readFileSync(SHELL, "utf8");
    expect(src).toContain("app-shell-header");
    expect(src).toContain("app-shell-main");
    expect(src).toContain("app-shell-nav-link");
    expect(src).toContain("min-h-11");
  });
});
