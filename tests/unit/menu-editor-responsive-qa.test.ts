import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("menu editor + live menu responsive (prompt 29)", () => {
  it("uses iPad two-pane editor layout and phone-safe panes", () => {
    const editor = read("app/dashboard/restaurants/[id]/menu/MenuEditor.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(editor).toContain("menu-editor__layout");
    expect(editor).toContain("md:grid-cols-12");
    expect(editor).toContain("menu-editor__pane--categories");
    expect(editor).toContain("md:col-span-4 md:row-span-2");
    expect(editor).toContain("md:col-span-8 lg:col-span-5");
    expect(editor).toContain("menu-editor__form-actions");
    expect(editor).toContain("min-h-11 w-full");
    expect(css).toContain("Live menu + editor responsive (prompt 29)");
    expect(css).toMatch(
      /@media \(min-width: 768px\) and \(max-width: 1023px\)[\s\S]*\.menu-editor__pane--categories[\s\S]*position:\s*sticky/
    );
  });

  it("wraps live menu labels without horizontal scroll on phone", () => {
    const sidebar = read("app/dashboard/restaurants/[id]/LiveMenuSidebar.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(sidebar).toContain("kds-live-menu__cat-name");
    expect(sidebar).toContain("kds-live-menu__item-name");
    expect(sidebar).toContain("overflow-hidden");
    expect(css).toMatch(
      /@media \(max-width: 639px\)[\s\S]*\.kds-live-menu__cat-name[\s\S]*overflow-wrap:\s*anywhere/
    );
  });

  it("stacks modifier price fields on narrow screens", () => {
    const mods = read(
      "app/dashboard/restaurants/[id]/menu/ModifierGroupEditor.tsx"
    );
    expect(mods).toContain("grid-cols-1 gap-3 sm:grid-cols-2");
    expect(mods).toContain("sm:grid-cols-[1fr_100px_auto]");
  });
});
