import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ORDER_ACTION_LABELS } from "@/lib/order-status";

const REPO = join(import.meta.dirname, "../..");

describe("order action labels", () => {
  it("uses distinct owner-facing verbs", () => {
    expect(ORDER_ACTION_LABELS.accept).toBe("Accept");
    expect(ORDER_ACTION_LABELS.start).toBe("Start");
    expect(ORDER_ACTION_LABELS.mark_ready).toBe("Ready");
    expect(ORDER_ACTION_LABELS.complete).toBe("Complete");
    expect(ORDER_ACTION_LABELS.cancel).toBe("Cancel");
  });

  it("OrderActionButton keeps label width while pending", () => {
    const src = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/order-card-parts.tsx"),
      "utf8"
    );
    expect(src).toContain("OrderActionButton");
    expect(src).toContain("aria-busy={pending}");
    expect(src).toContain("invisible");
    expect(src).not.toContain("…");
  });
});
