import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BILLABLE_PHONE_ORDER_RATE_USD,
  billableReceiptSessionKey,
  buildBillableReceiptSessionKeys,
  countBillablePhoneOrders,
  estimateBillablePhoneOrderChargeUsd,
  filterBillablePhoneOrderReceipts,
  isBillablePhoneOrderReceipt,
  isTestHarnessBillingSession,
  isTranscriptOnlyOrderCompletion,
} from "@/lib/billing/billable-orders";
import { buildLimitChecks } from "@/lib/billing/limits";
import { BILLING_LAUNCH_POSTURE } from "@/lib/billing/launch-posture";
import { DEV_MODE_LIMITS } from "@/lib/billing/plans";
import { RESTAURANT_ID } from "../fixtures/menu";

const REPO = join(import.meta.dirname, "../..");

function receipt(
  sessionId: string,
  items: unknown = [{ name: "Pie", quantity: 1, unit_price_cents: 1200 }]
) {
  return {
    restaurant_id: RESTAURANT_ID,
    session_id: sessionId,
    items,
    created_at: "2026-05-01T12:00:00.000Z",
  };
}

describe("billable phone orders", () => {
  it("counts receipt-backed successful phone orders", () => {
    const rows = [receipt("conv-live-1"), receipt("conv-live-2")];
    expect(countBillablePhoneOrders(rows)).toBe(2);
    expect(estimateBillablePhoneOrderChargeUsd(2)).toBe(1.8);
  });

  it("dedupes duplicate receipt session keys", () => {
    const rows = [receipt("conv-live-1"), receipt("conv-live-1")];
    expect(countBillablePhoneOrders(rows)).toBe(1);
  });

  it("does not bill empty-cart receipts", () => {
    expect(isBillablePhoneOrderReceipt(receipt("conv-empty", []))).toBe(false);
    expect(countBillablePhoneOrders([receipt("conv-empty", [])])).toBe(0);
  });

  it("does not bill test harness sessions", () => {
    expect(isTestHarnessBillingSession("roal-harness-scenario-1")).toBe(true);
    expect(
      isBillablePhoneOrderReceipt(receipt("roal-harness-scenario-1"))
    ).toBe(false);
    expect(countBillablePhoneOrders([receipt("roal-harness-scenario-1")])).toBe(
      0
    );
  });

  it("treats transcript-only order_completed as not billable", () => {
    const keys = buildBillableReceiptSessionKeys([]);
    expect(
      isTranscriptOnlyOrderCompletion(RESTAURANT_ID, "conv-transcript-only", keys)
    ).toBe(true);
    const withReceipt = buildBillableReceiptSessionKeys([receipt("conv-live-1")]);
    expect(
      isTranscriptOnlyOrderCompletion(RESTAURANT_ID, "conv-live-1", withReceipt)
    ).toBe(false);
  });

  it("no-order / voicemail / reservation-only have no receipt and are not billable", () => {
    expect(countBillablePhoneOrders([])).toBe(0);
    expect(
      filterBillablePhoneOrderReceipts([
        receipt("conv-faq", []),
        receipt("roal-harness-faq", [{ name: "Q", quantity: 1, unit_price_cents: 0 }]),
      ])
    ).toHaveLength(0);
  });

  it("uses stable receipt session keys for tenant scoping", () => {
    const key = billableReceiptSessionKey(RESTAURANT_ID, " conv-1 ");
    expect(key).toBe(`${RESTAURANT_ID}:conv-1`);
  });

  it("exposes pilot rate constant", () => {
    expect(BILLABLE_PHONE_ORDER_RATE_USD).toBe(0.9);
  });
});

describe("billing UI and loaders (pass 66)", () => {
  it("authenticated billing copy says $0.90 per successful phone order", () => {
    expect(BILLING_LAUNCH_POSTURE.pilotRate).toBe(
      "$0.90 per successful phone order"
    );
    expect(BILLING_LAUNCH_POSTURE.pilotRateDetail).toMatch(/not charged/i);

    const dash = readFileSync(
      join(REPO, "components/billing/BillingDashboard.tsx"),
      "utf8"
    );
    expect(dash).toContain("BILLING_LAUNCH_POSTURE.pilotRate");
    expect(dash).toContain("billablePhoneOrders");
    expect(dash).toContain("estimatedBillableChargeUsd");
    expect(dash).toMatch(/Missed and no-order calls are not charged/i);
    expect(dash).not.toMatch(/demo invoice|fabricat|seed/i);
  });

  it("load-billing queries phone_order_receipts and supports org access filter", () => {
    const load = readFileSync(join(REPO, "lib/billing/load-billing.ts"), "utf8");
    expect(load).toContain("phone_order_receipts");
    expect(load).toContain("countBillablePhoneOrders");
    expect(load).toContain("accessibleRestaurantIds");
    expect(load).toContain("loadScopedRestaurantIds");
  });

  it("org billing page passes accessible restaurant ids", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/billing/page.tsx"),
      "utf8"
    );
    expect(page).toContain("accessibleRestaurantIds");
  });

  it("limit meter labels successful phone orders from billable count", () => {
    const checks = buildLimitChecks(
      {
        menuScans: 0,
        billablePhoneOrders: 3,
        estimatedBillableChargeUsd: 2.7,
        toolCalls: 0,
        importAttempts: 0,
        activeLocations: 1,
        restaurantCount: 1,
      },
      DEV_MODE_LIMITS,
      { scope: "restaurant" }
    );
    const voice = checks.find((c) => c.key === "voice_orders");
    expect(voice?.label).toBe("Successful phone orders");
    expect(voice?.used).toBe(3);
    expect(checks.some((c) => c.key === "completed_orders")).toBe(false);
  });

  it("honest empty invoice table", () => {
    const dash = readFileSync(
      join(REPO, "components/billing/BillingDashboard.tsx"),
      "utf8"
    );
    expect(dash).toContain("No invoices yet");
    expect(dash).not.toMatch(/sample invoice|demo row/i);
  });
});
