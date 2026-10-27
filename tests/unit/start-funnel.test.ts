import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trial/elevenlabs", () => ({ ensureTrialAgentId: vi.fn() }));
vi.mock("@/lib/elevenlabs", () => ({ startConvaiOutboundCall: vi.fn() }));

import { validateLead } from "@/lib/trial/lead";
import { estimateMissedRevenue } from "@/lib/start/estimate";
import { toE164Phone } from "@/lib/phone/e164";

describe("validateLead", () => {
  it("accepts a clean contact and normalizes phone + email", () => {
    const r = validateLead({ name: "  Maria   Lopez ", phone: "(512) 555-0199", email: "Maria@Taqueria.com", answers: { missedCalls: "some", ticket: "t25" } });
    expect(r).toEqual({
      ok: true,
      lead: { name: "Maria Lopez", phone: "+15125550199", email: "maria@taqueria.com", answers: { missedCalls: "some", ticket: "t25" } },
    });
  });

  it("returns a message per bad field", () => {
    const r = validateLead({ name: "M", phone: "123", email: "nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["email", "name", "phone"]);
  });

  it("drops unexpected answer values instead of storing them", () => {
    const r = validateLead({ name: "Sam", phone: "5125550199", email: "s@x.co", answers: { missedCalls: "<script>", ticket: 5 } });
    expect(r.ok && r.lead.answers).toEqual({});
  });

  it("handles a missing body", () => {
    expect(validateLead(null).ok).toBe(false);
  });
});

describe("estimateMissedRevenue", () => {
  it("builds the number only from the owner's answers", () => {
    // 10 missed a night × 4 busy nights = 40/week, half order = 20 × $32 = $640/week.
    expect(estimateMissedRevenue("some", "t25")).toEqual({
      missedPerWeek: 40,
      ordersPerWeek: 20,
      weekly: 640,
      monthly: 2773,
      roalMonthlyCost: 78,
    });
  });

  it("falls back to modest defaults when unsure", () => {
    const e = estimateMissedRevenue("unsure", undefined);
    expect(e.missedPerWeek).toBe(12);
    expect(e.ordersPerWeek).toBe(6);
  });
});

describe("toE164Phone", () => {
  it("formats US numbers and rejects junk", () => {
    expect(toE164Phone("512-555-0199")).toBe("+15125550199");
    expect(toE164Phone("+44 20 7946 0958")).toBe("+442079460958");
    expect(toE164Phone("555")).toBeNull();
  });
});
