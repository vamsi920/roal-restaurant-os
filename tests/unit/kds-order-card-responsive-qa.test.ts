import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Kitchen ticket card (v3)", () => {
  it("renders a ticket with number, guest, time, items, total, and actions", () => {
    const card = read("app/dashboard/restaurants/[id]/KitchenOrderCard.tsx");

    expect(card).toContain('"kds-ticket"');
    expect(card).toContain("ticketNumber(order.id)");
    expect(card).toContain("<CustomerLine");
    expect(card).toContain("<OrderItemsList");
    expect(card).toContain("<FulfillmentLine");
    expect(card).toContain("formatTicketClock(order.created_at)");
    expect(card).toContain("font-mono");
    expect(card).toContain('role="alert"');
    expect(card).toContain("OrderActionButton");
    expect(card).not.toContain("session_id");
  });

  it("uses tablet-readable type and highlighted notes", () => {
    const parts = read("app/dashboard/restaurants/[id]/order-card-parts.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(parts).toContain("text-[19px]");
    expect(parts).toContain("text-[15px]");
    expect(parts).toContain("kds-ticket__note");
    expect(css).toContain(".kds-ticket__note");
    expect(css).toContain("rgb(var(--ticket))");
  });

  it("keeps 44px status actions wired through OrderActionButton", () => {
    const parts = read("app/dashboard/restaurants/[id]/order-card-parts.tsx");
    expect(parts).toContain("ORDER_ACTION_LABELS");
    expect(parts).toContain("aria-busy={pending}");
    expect(parts).toContain("btn-lg");
    expect(parts).toContain("min-h-11");
    expect(parts).toContain("PickupStatusBadge");
    expect(parts).toContain("FulfillmentLine");
  });
});
