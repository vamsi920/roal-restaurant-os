import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Kitchen board views (v3)", () => {
  it("labels Board / Done tabs with counts for screen readers", () => {
    const panel = read("app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx");

    expect(panel).toContain('role="tablist"');
    expect(panel).toContain('role="tab"');
    expect(panel).toContain("aria-label={`${label}, ${count} orders`}");
    expect(panel).toContain('label="Board"');
    expect(panel).toContain('label="Done"');
  });

  it("shows sync problems as notices with a refresh, using formatted errors", () => {
    const panel = read("app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx");

    expect(panel).toContain("formatSupabaseClientError");
    expect(panel).toContain("<Notice");
    expect(panel).toContain("Live updates paused.");
    expect(panel).toContain("<RefreshButton");
  });

  it("puts a one-line live call strip at the top of the board", () => {
    const strip = read("app/dashboard/restaurants/[id]/CallStatusStrip.tsx");
    const indicator = read("app/dashboard/restaurants/[id]/LiveCallIndicator.tsx");

    expect(strip).toContain("Waiting for calls");
    expect(strip).toContain("truncate");
    expect(strip).toContain("kds-live-dot");
    expect(indicator).toContain("taking an order");
  });
});
