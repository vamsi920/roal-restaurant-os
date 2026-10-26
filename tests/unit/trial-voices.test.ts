import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRIAL_VOICE,
  defaultAgentName,
  findTrialVoice,
  resolveTrialPersona,
  TRIAL_VOICE_OPTIONS,
} from "@/lib/trial/voices";

describe("findTrialVoice", () => {
  it("finds a curated voice by id", () => {
    expect(findTrialVoice("nPczCjzI2devNBz1zQrb")?.label).toBe("Brian");
    expect(findTrialVoice("  nPczCjzI2devNBz1zQrb ")?.label).toBe("Brian");
  });

  it("returns null for unknown or empty ids", () => {
    expect(findTrialVoice("not-a-voice")).toBeNull();
    expect(findTrialVoice("")).toBeNull();
    expect(findTrialVoice(null)).toBeNull();
    expect(findTrialVoice(undefined)).toBeNull();
  });

  it("voice ids are unique", () => {
    const ids = TRIAL_VOICE_OPTIONS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TRIAL_VOICE_OPTIONS).toContain(DEFAULT_TRIAL_VOICE);
  });
});

describe("resolveTrialPersona", () => {
  it("fills every field with defaults when nothing is stored", () => {
    expect(resolveTrialPersona(null, "Joe's Pizza")).toEqual({
      agentName: defaultAgentName(),
      voiceId: DEFAULT_TRIAL_VOICE.id,
      voiceLabel: DEFAULT_TRIAL_VOICE.label,
      language: "en",
    });
    expect(resolveTrialPersona(undefined, null).agentName).toBe("Addy");
    expect(resolveTrialPersona({}, null).voiceLabel).toBe("Sarah");
  });

  it("keeps a valid stored persona and trims whitespace", () => {
    expect(
      resolveTrialPersona({ agentName: "  Maya ", voiceId: "Xb7hH8MSUJpSbSDYk0k2", language: " es " }, "X")
    ).toEqual({ agentName: "Maya", voiceId: "Xb7hH8MSUJpSbSDYk0k2", voiceLabel: "Alice", language: "es" });
  });

  it("falls back to the default voice for an unknown voice id and ignores a stale label", () => {
    const persona = resolveTrialPersona(
      { agentName: "", voiceId: "bogus", voiceLabel: "Stale", language: "" },
      "X"
    );
    expect(persona).toEqual({
      agentName: "Addy",
      voiceId: DEFAULT_TRIAL_VOICE.id,
      voiceLabel: DEFAULT_TRIAL_VOICE.label,
      language: "en",
    });
  });
});
