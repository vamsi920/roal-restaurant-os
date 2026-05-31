import { describe, expect, it } from "vitest";
import { buildReviewHints } from "@/lib/menu-import/review-hints";
import { toMergeMenu } from "@/lib/menu-import/types";
import type { ScannedMenu } from "@/lib/menu-import/types";

describe("menu scan flow", () => {
  it("blocks commit when scan produced categories but no items", () => {
    const menu: ScannedMenu = {
      categories: [{ name: "Mains", items: [] }],
    };
    const hints = buildReviewHints(menu);
    expect(hints.some((h) => h.severity === "error" && /no menu items/i.test(h.message))).toBe(
      true
    );
  });

  it("toMergeMenu preserves category and item names for merge_menu RPC", () => {
    const merged = toMergeMenu({
      categories: [
        {
          name: "Pizza",
          items: [
            {
              name: "Margherita",
              price: 14,
              modifiers: [],
            },
          ],
        },
      ],
    });
    expect(merged.categories[0]?.name).toBe("Pizza");
    expect(merged.categories[0]?.items[0]?.name).toBe("Margherita");
    expect(merged.categories[0]?.items[0]?.price).toBe(14);
  });
});
