import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const KDS_PAGE = join(REPO, "app/dashboard/restaurants/[id]/page.tsx");

describe("KDS workspace UX", () => {
  it("imports kds-workspace styles and ops-first panel order", () => {
    const page = readFileSync(KDS_PAGE, "utf8");
    expect(page).toContain("kds-workspace.css");
    expect(page).toContain('className="kds-workspace');

    const ordersIdx = page.indexOf("<LiveOrdersPanel");
    const menuIdx = page.indexOf("<LiveMenuSidebar");
    expect(ordersIdx).toBeGreaterThan(-1);
    expect(menuIdx).toBeGreaterThan(-1);
    expect(ordersIdx).toBeLessThan(menuIdx);
  });

  it("uses overflow-safe menu grid columns", () => {
    const page = readFileSync(KDS_PAGE, "utf8");
    expect(page).toContain("minmax(0,24rem)");
    expect(page).toContain("min-w-0");
  });

  it("collapses profile by default like hours", () => {
    const profile = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/RestaurantProfileSettings.tsx"),
      "utf8"
    );
    expect(profile).toContain("const [open, setOpen] = useState(false)");
  });

  it("avoids dev jargon in live orders empty state", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("kds-empty-state");
    expect(panel).not.toMatch(/No active voice carts[\s\S]*sync_draft_order/);
  });

  it("collapses voice test harness by default", () => {
    const harness = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/VoiceAgentTestHarness.tsx"),
      "utf8"
    );
    expect(harness).toContain("const [open, setOpen] = useState(false)");
    expect(harness).toContain("voice-harness-panel");
  });
});
