import { describe, expect, it } from "vitest";
import {
  getUpsellExperimentVariant,
  hashUpsellExperimentKey,
} from "@/lib/restaurant-upsell/experiment";

describe("upsell experiment assignment", () => {
  it("keeps call assignment deterministic", () => {
    const first = getUpsellExperimentVariant("restaurant-1", "call-123");
    const second = getUpsellExperimentVariant("restaurant-1", "call-123");

    expect(second).toBe(first);
    expect(["treatment", "control"]).toContain(first);
    expect(hashUpsellExperimentKey("restaurant-1:call-123")).toBe(
      hashUpsellExperimentKey("restaurant-1:call-123")
    );
  });

  it("defaults missing session ids to treatment so measured calls keep upsells on", () => {
    expect(getUpsellExperimentVariant("restaurant-1", "")).toBe("treatment");
    expect(getUpsellExperimentVariant("restaurant-1", null)).toBe("treatment");
  });

  it("can produce both treatment and control buckets for one restaurant", () => {
    const variants = new Set(
      Array.from({ length: 30 }, (_, i) =>
        getUpsellExperimentVariant("restaurant-1", `call-${i}`)
      )
    );

    expect(variants.has("treatment")).toBe(true);
    expect(variants.has("control")).toBe(true);
  });
});
