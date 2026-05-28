import { describe, expect, it } from "vitest";
import {
  evaluateBillingGate,
  evaluateOrganizationGates,
  isGateWarning,
} from "@/lib/billing/gates";
import { buildLimitChecks } from "@/lib/billing/limits";
import { planLimitJsonResponse } from "@/lib/billing/gate-http";
import type { BillingSnapshot } from "@/lib/billing/types";

function snapshot(overrides: Partial<BillingSnapshot> = {}): BillingSnapshot {
  const usage = {
    menuScans: 39,
    voiceOrders: 10,
    completedOrders: 5,
    toolCalls: 100,
    importAttempts: 0,
    activeLocations: 1,
    restaurantCount: 1,
    ...(overrides.usage ?? {}),
  };
  const effectiveLimits = {
    max_active_locations: 2,
    max_menu_scans_per_period: 40,
    max_voice_orders_per_period: 150,
    max_completed_orders_per_period: 120,
    max_tool_calls_per_period: 2000,
    ...(overrides.effectiveLimits ?? {}),
  };
  return {
    scope: "organization",
    restaurantId: null,
    restaurantName: null,
    providerMode: "stripe",
    providerConfigured: true,
    checkoutEnabled: true,
    stripeCustomerLinked: false,
    organizationId: "11111111-1111-4111-8111-111111111111",
    organizationName: "Test Org",
    plan: {
      id: "starter",
      name: "Starter",
      description: "",
      monthlyPriceUsd: 149,
      limits: effectiveLimits,
      features: {
        menu_scan: true,
        voice_agent: true,
        kds_orders: true,
        multi_location: false,
        priority_support: false,
        api_access: false,
      },
    },
    effectiveLimits,
    subscriptionStatus: "active",
    effectiveStatus: "active",
    trialEndsAt: null,
    trialDaysRemaining: null,
    isTrialActive: false,
    periodStart: new Date().toISOString(),
    periodEnd: new Date().toISOString(),
    usage,
    limitChecks: buildLimitChecks(usage, effectiveLimits),
    features: [],
    canManageBilling: true,
    upgradePlanIds: ["growth"],
    ...overrides,
  };
}

describe("evaluateBillingGate", () => {
  it("allows dev mode even at limit", () => {
    const s = snapshot({
      providerMode: "dev",
      effectiveStatus: "dev",
      usage: {
        menuScans: 999,
        voiceOrders: 999,
        completedOrders: 0,
        toolCalls: 0,
        importAttempts: 0,
        activeLocations: 99,
        restaurantCount: 99,
      },
    });
    const verdict = evaluateBillingGate(s, "menu_scan", { additionalUsage: 1 });
    expect(verdict.allowed).toBe(true);
    expect(verdict.hardBlocked).toBe(false);
    expect(verdict.showUpgrade).toBe(false);
  });

  it("hard blocks stripe mode when scan limit exceeded", () => {
    const s = snapshot({
      usage: {
        menuScans: 40,
        voiceOrders: 0,
        completedOrders: 0,
        toolCalls: 0,
        importAttempts: 0,
        activeLocations: 1,
        restaurantCount: 1,
      },
    });
    const verdict = evaluateBillingGate(s, "menu_scan", { additionalUsage: 1 });
    expect(verdict.allowed).toBe(false);
    expect(verdict.hardBlocked).toBe(true);
    expect(verdict.showUpgrade).toBe(true);
    expect(verdict.message).toContain("menu scans");
  });

  it("soft-warns below hard block in stripe mode", () => {
    const s = snapshot({
      usage: {
        menuScans: 32,
        voiceOrders: 0,
        completedOrders: 0,
        toolCalls: 0,
        importAttempts: 0,
        activeLocations: 1,
        restaurantCount: 1,
      },
    });
    const verdict = evaluateBillingGate(s, "menu_scan", { additionalUsage: 1 });
    expect(verdict.allowed).toBe(true);
    expect(verdict.level).toBe("warning");
    expect(isGateWarning(verdict)).toBe(true);
    expect(verdict.showUpgrade).toBe(true);
  });

  it("blocks inactive stripe subscription", () => {
    const s = snapshot({
      subscriptionStatus: "past_due",
      effectiveStatus: "past_due",
    });
    const verdict = evaluateBillingGate(s, "voice_order", { additionalUsage: 1 });
    expect(verdict.allowed).toBe(false);
    expect(verdict.title).toBe("Subscription inactive");
  });

  it("hard blocks create_restaurant at location cap in stripe mode", () => {
    const s = snapshot({
      usage: {
        menuScans: 0,
        voiceOrders: 0,
        completedOrders: 0,
        toolCalls: 0,
        importAttempts: 0,
        activeLocations: 2,
        restaurantCount: 2,
      },
      effectiveLimits: {
        max_active_locations: 2,
        max_menu_scans_per_period: 40,
        max_voice_orders_per_period: 150,
        max_completed_orders_per_period: 120,
        max_tool_calls_per_period: 2000,
      },
    });
    const verdict = evaluateBillingGate(s, "create_restaurant", {
      additionalUsage: 1,
    });
    expect(verdict.allowed).toBe(false);
    expect(verdict.hardBlocked).toBe(true);
    expect(verdict.title).toBe("Location limit reached");
  });

  it("uses correct limit when limitChecks omitted", () => {
    const s = snapshot({
      limitChecks: [],
      usage: {
        menuScans: 40,
        voiceOrders: 0,
        completedOrders: 0,
        toolCalls: 0,
        importAttempts: 0,
        activeLocations: 1,
        restaurantCount: 1,
      },
    });
    const verdict = evaluateBillingGate(s, "menu_scan", { additionalUsage: 1 });
    expect(verdict.limit).toBe(40);
    expect(verdict.hardBlocked).toBe(true);
  });
});

describe("evaluateOrganizationGates", () => {
  it("returns all gate actions", () => {
    const gates = evaluateOrganizationGates(snapshot());
    expect(gates.menu_scan.action).toBe("menu_scan");
    expect(gates.create_restaurant.action).toBe("create_restaurant");
    expect(gates.voice_order.action).toBe("voice_order");
  });
});

describe("planLimitJsonResponse", () => {
  it("returns structured 402 payload", () => {
    const verdict = evaluateBillingGate(
      snapshot({ usage: { menuScans: 40, voiceOrders: 0, completedOrders: 0, toolCalls: 0, importAttempts: 0, activeLocations: 1, restaurantCount: 1 } }),
      "menu_scan",
      { additionalUsage: 1 }
    );
    const res = planLimitJsonResponse(verdict);
    expect(res.status).toBe(402);
  });
});
