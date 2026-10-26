import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { importWebsiteMenuFromUrl } from "@/lib/restaurant-lookup/import-website-menu";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("website menu import gate", () => {
  it("does not treat unpriced Gemini output as a menu", async () => {
    const result = await importWebsiteMenuFromUrl("https://example.com", {
      fetchImpl: async () =>
        new Response(
          `<html><body><h1>Dinner Menu</h1><p>We serve burgers, fries, shakes, and specials every night of the week with delivery partners listed below.</p><p>Classic Burger twelve dollars. Fries three dollars.</p></body></html>`,
          {
            headers: { "content-type": "text/html" },
          }
        ),
      extractText: async () => ({
        data: {
          categories: [{ name: "Mains", items: [{ name: "Burger" }] }],
        },
        modelUsed: "test",
      }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unpriced");
  });
});

describe("magic setup wiring", () => {
  it("onboarding apply and try-call use existing provision plus signed URL", () => {
    const actions = read("app/dashboard/onboarding/actions.ts");
    const voice = read("components/onboarding/onboarding-voice-agent-step.tsx");
    const tryCall = read("components/onboarding/onboarding-try-call.tsx");
    expect(actions).toContain("applyRestaurantLookupAction");
    expect(actions).toContain("tryProvisionVoiceAgentForNewRestaurant");
    expect(actions).toContain("getConvaiSignedUrl");
    expect(actions).toContain("startConvaiOutboundCall");
    expect(voice).toContain("OnboardingTryCall");
    expect(tryCall).toContain("Talk to your agent now");
  });
});
