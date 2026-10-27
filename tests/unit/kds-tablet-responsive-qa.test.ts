import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Kitchen board on tablets (v3)", () => {
  it("lays out New / Preparing / Ready lanes with a container query", () => {
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(css).toContain("container-type: inline-size");
    expect(css).toMatch(
      /@container kds-board \(min-width: 720px\)[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/
    );
    expect(css).toMatch(/\.kds-board__lane\[data-active="false"\]\s*\{\s*display:\s*none/);
  });

  it("uses a lane picker on narrow boards and lane sections on wide ones", () => {
    const panel = read("app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx");
    const lane = read("app/dashboard/restaurants/[id]/KdsQueueSection.tsx");

    expect(panel).toContain("kds-board__picker");
    expect(panel).toContain('title="New"');
    expect(panel).toContain('title="Preparing"');
    expect(panel).toContain('title="Ready"');
    expect(lane).toContain("data-active");
    expect(lane).toContain("kds-lane__empty");
  });

  it("keeps the board full width in the workspace main column", () => {
    const page = read("app/dashboard/restaurants/[id]/page.tsx");
    const panel = read("app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx");

    expect(page).toContain("kds-workspace--kitchen");
    expect(page).toContain("min-w-0 w-full");
    expect(panel).toContain("kds-board");
    expect(panel).toContain("KitchenOrderCard");
  });
});
