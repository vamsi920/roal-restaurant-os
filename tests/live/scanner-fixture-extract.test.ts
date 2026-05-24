import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractMenuFromImage } from "@/lib/scanner/extract-menu";

const FIXTURE = join(import.meta.dirname, "../fixtures/sample-menu.png");
const live = process.env.RUN_LIVE_SCANNER === "1";

describe.runIf(live)("live menu scanner fixture", () => {
  it(
    "extracts categories and items from sample-menu.png via Gemini",
    async () => {
      const bytes = readFileSync(FIXTURE);
      const file = new File([bytes], "sample-menu.png", { type: "image/png" });
      const { menu, hints, modelUsed } = await extractMenuFromImage(file);

      expect(modelUsed.length).toBeGreaterThan(0);
      expect(menu.categories.length).toBeGreaterThanOrEqual(2);

      const itemNames = menu.categories.flatMap((c) =>
        c.items.map((i) => i.name.toLowerCase())
      );
      const matched = ["bruschetta", "margherita", "tiramisu", "caesar"].filter(
        (needle) => itemNames.some((n) => n.includes(needle))
      );
      expect(matched.length).toBeGreaterThanOrEqual(2);

      const errors = hints.filter((h) => h.severity === "error");
      expect(errors.length).toBe(0);
    },
    120_000
  );
});

describe("live menu scanner fixture (skipped without RUN_LIVE_SCANNER)", () => {
  it.skipIf(live)("documents opt-in flag", () => {
    expect(process.env.RUN_LIVE_SCANNER).not.toBe("1");
  });
});
