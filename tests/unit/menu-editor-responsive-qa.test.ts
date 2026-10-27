import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("menu editor + live menu responsive (prompt 29)", () => {
  it("lays out categories beside items with inline item editing", () => {
    const editor = read("app/dashboard/restaurants/[id]/menu/MenuEditor.tsx");

    expect(editor).toContain("lg:grid-cols-[15rem_minmax(0,1fr)]");
    expect(editor).toContain('aria-label="Menu categories"');
    expect(editor).toContain("aria-expanded={expanded}");
    expect(editor).toContain("<ItemForm");
    expect(editor).toContain("<CategoryForm");
    expect(editor).toContain("<ModifierGroupEditor");
    expect(editor).toContain("<ModifierGroupList");
    // Availability switch reuses the existing item save action.
    expect(editor).toContain("<ToggleSwitch");
    expect(editor).toContain("toggleAvailability");
    expect(editor).toContain("saveItemAction(restaurantId, {");
  });

  it("truncates live menu labels without horizontal scroll on phone", () => {
    const sidebar = read("app/dashboard/restaurants/[id]/LiveMenuSidebar.tsx");
    const editor = read("app/dashboard/restaurants/[id]/menu/MenuEditor.tsx");

    expect(sidebar).toContain("overflow-hidden");
    expect(sidebar).toContain("truncate");
    expect(editor).toContain("min-w-0 truncate");
  });

  it("keeps modifier option rows narrow-screen safe", () => {
    const mods = read(
      "app/dashboard/restaurants/[id]/menu/ModifierGroupEditor.tsx"
    );
    expect(mods).toContain("grid-cols-[minmax(0,1fr)_6.5rem_auto]");
    expect(mods).toContain('aria-label={`Remove option ${idx + 1}`}');
  });
});
