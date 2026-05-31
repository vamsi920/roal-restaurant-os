import { describe, expect, it } from "vitest";
import {
  isVoiceProvisionApiFailure,
  resolvePostCreateRestaurantHref,
  resolveRestaurantCardHref,
  voiceProvisionUiStateFromProfile,
} from "@/lib/voice-agent/provision-display";

const RID = "00000000-0000-4000-8000-000000000099";

describe("voice provision display", () => {
  it("routes to agent when API provision failed", () => {
    expect(
      resolvePostCreateRestaurantHref(RID, {
        ok: false,
        warning: "down",
        phase: "provision",
        agent_id: null,
      })
    ).toBe(`/dashboard/restaurants/${RID}/agent`);
  });

  it("routes to live orders when provision succeeded", () => {
    expect(
      resolvePostCreateRestaurantHref(RID, {
        ok: true,
        agent_id: "agent_1",
        method: "duplicate",
      })
    ).toBe(`/dashboard/restaurants/${RID}`);
  });

  it("routes skipped provision to Live Agent for retry", () => {
    expect(
      isVoiceProvisionApiFailure({
        ok: false,
        warning: "skipped",
        skipped: true,
      })
    ).toBe(false);
    expect(
      resolvePostCreateRestaurantHref(RID, {
        ok: false,
        warning: "skipped",
        skipped: true,
      })
    ).toBe(`/dashboard/restaurants/${RID}/agent`);
  });

  it("shows needs_attention when skipped error is stored without agent id", () => {
    expect(
      voiceProvisionUiStateFromProfile({
        elevenlabs_provision_status: null,
        elevenlabs_provision_error:
          "Voice agent auto-setup skipped (ELEVENLABS_AGENT_ID not configured). Connect manually from Live Agent.",
        elevenlabs_agent_id: null,
      })
    ).toBe("needs_attention");
  });

  it("card href follows profile provision state", () => {
    expect(
      resolveRestaurantCardHref(RID, {
        elevenlabs_provision_status: "failed",
        elevenlabs_provision_error: "sync",
        elevenlabs_agent_id: "agent_1",
      })
    ).toBe(`/dashboard/restaurants/${RID}/agent`);

    expect(
      resolveRestaurantCardHref(RID, {
        elevenlabs_provision_status: "ready",
        elevenlabs_provision_error: null,
        elevenlabs_agent_id: "agent_1",
      })
    ).toBe(`/dashboard/restaurants/${RID}`);
  });

  it("maps provisioning status to in_progress", () => {
    expect(
      voiceProvisionUiStateFromProfile({
        elevenlabs_provision_status: "provisioning",
        elevenlabs_provision_error: null,
        elevenlabs_agent_id: null,
      })
    ).toBe("in_progress");
  });
});
