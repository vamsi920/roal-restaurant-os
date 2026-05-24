import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ONBOARDING_STEP_DESCRIPTIONS } from "@/lib/onboarding/steps";

const REPO = join(import.meta.dirname, "../..");

describe("onboarding UX (launch 11)", () => {
  it("does not promise hours UI in restaurant profile step copy", () => {
    const copy = ONBOARDING_STEP_DESCRIPTIONS.restaurant_profile;
    expect(copy).not.toMatch(/\bhours\b.*\band\b.*\bphone\b/i);
    expect(copy).toContain("kitchen workspace");
  });

  it("wizard supports menu and test-call skip", () => {
    const wizard = readFileSync(
      join(REPO, "components/onboarding/onboarding-wizard.tsx"),
      "utf8"
    );
    expect(wizard).toContain('step: "menu_import"');
    expect(wizard).toContain('status: "skipped"');
    expect(wizard).toContain('step: "test_call"');
    expect(wizard).toContain("Skip for now");
    expect(wizard).toContain("isOnboardingStepNavDisabled");
    expect(wizard).toContain('role="alert"');
  });

  it("onboarding page redirects guests to login with next", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/onboarding/page.tsx"),
      "utf8"
    );
    expect(page).toContain("/login?next=/dashboard/onboarding");
  });
});
