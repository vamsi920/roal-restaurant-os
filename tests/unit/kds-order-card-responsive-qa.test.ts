import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("KDS order card responsive (prompt 24)", () => {
  it("structures card regions for customer, items, totals, and actions", () => {
    const card = read("app/dashboard/restaurants/[id]/KitchenOrderCard.tsx");
    const parts = read("app/dashboard/restaurants/[id]/order-card-parts.tsx");

    expect(card).toContain("kds-order-card__actions");
    expect(card).toContain("kds-order-card__total");
    expect(card).toContain('role="alert"');
    expect(parts).toContain("kds-order-card__name");
    expect(parts).toContain("kds-order-card__items");
    expect(parts).toContain("kds-order-card__note");
    expect(parts).toContain("kds-order-card__details-link");
    expect(parts).toContain("min-h-11");
  });

  it("styles phone-readable cards without hiding real order fields", () => {
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");
    expect(css).toContain("Order cards phone comfort (prompt 24)");
    expect(css).toMatch(
      /@media \(max-width: 639px\)[\s\S]*\.kds-order-card__name[\s\S]*text-overflow:\s*ellipsis/
    );
    expect(css).toMatch(
      /@media \(max-width: 639px\)[\s\S]*\.kds-order-card__actions[\s\S]*min-height:\s*2\.75rem/
    );
    expect(css).toMatch(
      /@media \(max-width: 639px\)[\s\S]*\.kds-order-card__note[\s\S]*font-style:\s*normal/
    );
  });

  it("keeps status actions wired through OrderActionButton", () => {
    const parts = read("app/dashboard/restaurants/[id]/order-card-parts.tsx");
    expect(parts).toContain("ORDER_ACTION_LABELS");
    expect(parts).toContain("aria-busy={pending}");
    expect(parts).toContain("PickupStatusBadge");
    expect(parts).toContain("FulfillmentLine");
    expect(parts).toContain("kds-order-card__fulfillment");
  });
});
