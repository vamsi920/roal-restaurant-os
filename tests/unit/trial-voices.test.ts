import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRIAL_VOICE,
  defaultAgentName,
  findTrialVoice,
  resolveTrialPersona,
  TRIAL_VOICE_OPTIONS,
  voiceForCuisine,
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
    expect(resolveTrialPersona(null, "Corner Diner")).toEqual({
      agentName: defaultAgentName(),
      voiceId: DEFAULT_TRIAL_VOICE.id,
      voiceLabel: DEFAULT_TRIAL_VOICE.label,
      language: "en",
    });
    expect(resolveTrialPersona(undefined, null).agentName).toBe("Sarah");
    expect(resolveTrialPersona({}, null).voiceLabel).toBe("Sarah");
  });

  it("names the host after the voice matched to the cuisine, never the restaurant", () => {
    expect(resolveTrialPersona(null, "Eggmania", "Indian")).toMatchObject({
      agentName: "Anika",
      voiceId: "90ipbRoKi4CpHXvKVtl0",
    });
    // Without a cuisine the restaurant name can still hint at one.
    expect(resolveTrialPersona(null, "Joe's Pizza").agentName).toBe("Antonio");
    // The cuisine wins over the name.
    expect(resolveTrialPersona(null, "Taco Pizza Palace", "Mexican").agentName).toBe("Leo");
  });

  it("keeps an owner-picked voice and name over the cuisine match", () => {
    expect(resolveTrialPersona({ voiceId: "nPczCjzI2devNBz1zQrb" }, "Eggmania", "Indian")).toMatchObject({
      agentName: "Brian",
      voiceLabel: "Brian",
    });
    expect(resolveTrialPersona({ agentName: "Priya" }, "Eggmania", "Indian").agentName).toBe("Priya");
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
      agentName: "Sarah",
      voiceId: DEFAULT_TRIAL_VOICE.id,
      voiceLabel: DEFAULT_TRIAL_VOICE.label,
      language: "en",
    });
  });
});

describe("voiceForCuisine", () => {
  it("matches cuisine keywords to an accent voice", () => {
    expect(voiceForCuisine("North Indian, Biryani")?.accent).toBe("Indian");
    expect(voiceForCuisine("Lebanese")?.accent).toBe("Middle Eastern");
    expect(voiceForCuisine("West Indian")?.accent).toBe("Caribbean");
    expect(voiceForCuisine("Sushi bar")?.accent).toBe("Japanese");
  });

  it("returns null when nothing matches", () => {
    expect(voiceForCuisine("American diner", "Corner Diner")).toBeNull();
    expect(voiceForCuisine(null, null)).toBeNull();
  });

  it("only uses library voices that know how to be added to the account", () => {
    for (const v of TRIAL_VOICE_OPTIONS.filter((o) => o.cuisines?.length)) {
      expect(v.libraryOwnerId).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
