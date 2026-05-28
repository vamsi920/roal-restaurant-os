import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("restaurant workspace page metadata (prompt 29)", () => {
  it("KDS route exports Live orders tab title", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/page.tsx"),
      "utf8"
    );
    expect(page).toContain("export const metadata");
    expect(page).toContain("RESTAURANT_LIVE_ORDERS_LABEL");
    expect(page).toMatch(/title:.*RESTAURANT_LIVE_ORDERS_LABEL/);
  });

  it("menu setup route exports Menu & agent setup tab title", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/menu/page.tsx"),
      "utf8"
    );
    expect(page).toContain("export const metadata");
    expect(page).toContain("RESTAURANT_MENU_SETUP_TITLE");
    expect(page).toMatch(/title:.*RESTAURANT_MENU_SETUP_TITLE/);
  });
});
