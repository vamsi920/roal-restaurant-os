import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("dashboard owner CTAs (prompt 28)", () => {
  it("overview redirects to locations as primary post-login entry", () => {
    const page = readFileSync(join(REPO, "app/dashboard/page.tsx"), "utf8");
    expect(page).toContain('redirect("/dashboard/restaurants")');
    expect(page).not.toMatch(/admin ops|staff management/i);
    expect(page).not.toMatch(/\bKDS\b/);
  });

  it("locations list cards open restaurant workspace", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/restaurants/page.tsx"),
      "utf8"
    );
    expect(page).toContain("Open location");
    expect(page).toContain("/dashboard/restaurants/${restaurant.id}");
    expect(page).not.toMatch(/admin ops|staff management|manage your/i);
    expect(page).not.toMatch(/>\s*KDS\s*</);
  });
});
