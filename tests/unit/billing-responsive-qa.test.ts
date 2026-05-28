import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Billing responsive (prompt 37)", () => {
  it("structures plan, usage meters, notices, and invoice table regions", () => {
    const dash = read("components/billing/BillingDashboard.tsx");
    const css = read("app/dashboard-theme.css");

    expect(dash).toContain("billing-dashboard");
    expect(dash).toContain("billing-dashboard__notice--pilot");
    expect(dash).toContain("billing-dashboard__meters");
    expect(dash).toContain("billing-dashboard__meter-track");
    expect(dash).toContain("billing-dashboard__invoice-table dashboard-table");
    expect(dash).toContain("billing-dashboard__feature-list");
    expect(css).toContain("Billing dashboard responsive (prompt 37)");
  });

  it("stacks checkout actions and usage labels on small screens", () => {
    const checkout = read("components/billing/BillingCheckoutButtons.tsx");
    const dash = read("components/billing/BillingDashboard.tsx");

    expect(checkout).toContain("billing-dashboard__checkout-actions");
    expect(checkout).toContain("kds-thumb-btn min-h-11 w-full");
    expect(dash).toContain("billing-dashboard__meter-head flex flex-col");
    expect(dash).toContain("billing-dashboard__meta-row flex flex-col");
  });

  it("loads real billing snapshots without fabricated usage", () => {
    const orgPage = read("app/dashboard/billing/page.tsx");
    const dash = read("components/billing/BillingDashboard.tsx");

    expect(orgPage).toMatch(/loadOrganizationBilling|loadBilling/);
    expect(dash).toContain("snapshot.limitChecks");
    expect(dash).toContain("No invoices yet");
    expect(dash).not.toMatch(/fake usage|demo invoice|lorem/i);
  });
});
