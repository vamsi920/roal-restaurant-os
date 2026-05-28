import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("dashboard shell UX", () => {
  it("imports dashboard theme and exposes skip + main landmark", () => {
    const layout = readFileSync(join(REPO, "app/dashboard/layout.tsx"), "utf8");
    const shell = readFileSync(join(REPO, "components/dashboard/app-shell.tsx"), "utf8");

    expect(layout).toContain("dashboard-theme.css");
    expect(shell).toContain("app-shell-skip");
    expect(shell).toContain('id="app-main-content"');
    expect(shell).toContain('aria-current={active ? "page" : undefined}');
  });

  it("does not show org-level fake live badge in header", () => {
    const shell = readFileSync(join(REPO, "components/dashboard/app-shell.tsx"), "utf8");
    expect(shell).toContain("restaurantWorkspaceMobileTitle");
    expect(shell).not.toContain("showLiveBadge");
    expect(shell).not.toContain("app-shell-header-badge");
    expect(shell).not.toContain("pulse-dot");
  });

  it("has route-level loading skeleton", () => {
    const loading = readFileSync(join(REPO, "app/dashboard/loading.tsx"), "utf8");
    expect(loading).toContain('role="status"');
    expect(loading).toContain("glass-card");
  });

  it("restaurant list avoids hardcoded black title", () => {
    const page = readFileSync(join(REPO, "app/dashboard/restaurants/page.tsx"), "utf8");
    expect(page).not.toContain("#000000");
    expect(page).not.toContain("gradient-text");
    expect(page).toContain('aria-label="Loading restaurants"');
  });
});
