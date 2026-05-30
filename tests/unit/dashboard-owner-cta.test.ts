import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("dashboard owner CTAs (prompt 28)", () => {
  it("dashboard home routes admins to overview and members to locations", () => {
    const page = readFileSync(join(REPO, "app/dashboard/page.tsx"), "utf8");
    expect(page).toContain('redirect("/dashboard/overview")');
    expect(page).toContain('redirect("/dashboard/restaurants")');
    expect(page).not.toMatch(/admin ops|staff management/i);
    expect(page).not.toMatch(/\bKDS\b/);
  });

  it("locations list cards show real readiness and fast-path links", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/restaurants/page.tsx"),
      "utf8"
    );
    expect(page).toContain("loadRestaurantCardStats");
    expect(page).toContain("menuItemCount");
    expect(page).toContain("Last order");
    expect(page).toContain("FastPathLink");
    expect(page).toContain(">Orders<");
    expect(page).toContain(">Menu<");
    expect(page).toContain(">Agent<");
    expect(page).not.toMatch(/admin ops|staff management|manage your/i);
    expect(page).not.toMatch(/>\s*KDS\s*</);
  });
});
