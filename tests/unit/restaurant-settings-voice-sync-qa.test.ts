import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("restaurant settings voice sync (pass 11)", () => {
  it("profile and hours actions schedule background agent sync", () => {
    const profile = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/profile-actions.ts"),
      "utf8"
    );
    const hours = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/hours-actions.ts"),
      "utf8"
    );

    expect(profile).toContain("afterProfileSettingsMutation");
    expect(profile).not.toContain("void syncRestaurantAgentAfterContentChange");
    expect(hours).toContain("afterHoursSettingsMutation");
    expect(hours).not.toContain("void syncRestaurantAgentAfterContentChange");
  });

  it("settings UI saves through server actions", () => {
    const profileUi = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/RestaurantProfileSettings.tsx"),
      "utf8"
    );
    const hoursUi = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/RestaurantHoursSettings.tsx"),
      "utf8"
    );

    expect(profileUi).toContain("saveRestaurantProfileSettingsAction");
    expect(profileUi).toContain("allows_pickup");
    expect(profileUi).toContain("prep_time_minutes");
    expect(profileUi).toContain("escalation_name");
    expect(hoursUi).toContain("saveRestaurantHoursAction");
  });

  it("agent profile sync rebuilds prompt from DB profile and hours", () => {
    const sync = readFileSync(
      join(REPO, "lib/elevenlabs-restaurant-agent-profile.ts"),
      "utf8"
    );
    expect(sync).toContain("loadRestaurantHoursBundle");
    expect(sync).toContain("buildAgentHoursPromptFromBundle");
    expect(sync).toContain("buildRestaurantOrderAgentPrompt");
    expect(sync).toContain("getRestaurantProfile");
  });
});
