import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRIAL_VOICE,
  findTrialVoice,
  resolveTrialPersona,
  TRIAL_VOICE_OPTIONS,
  voiceForCuisine,
} from "@/lib/trial/voices";

describe("findTrialVoice", () => {
  it("finds a curated voice by id", () => {
    expect(findTrialVoice("UgBBYS2sOqTuMpoF3BR0")?.label).toBe("Mark");
    expect(findTrialVoice("  UgBBYS2sOqTuMpoF3BR0 ")?.label).toBe("Mark");
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
  it("gives a restaurant with no cuisine an American host, stable per restaurant", () => {
    const p = resolveTrialPersona(null, "Corner Diner");
    expect(findTrialVoice(p.voiceId)?.accent).toBe("American");
    expect(p.language).toBe("en");
    expect(p.agentName).toBeTruthy();
    expect(resolveTrialPersona(null, "Corner Diner")).toEqual(p);
    const unnamed = resolveTrialPersona(undefined, null);
    expect(unnamed.agentName).toBe(unnamed.voiceLabel);
  });

  it("matches the accent to the cuisine, then the name; cuisine wins", () => {
    expect(findTrialVoice(resolveTrialPersona(null, "Eggmania", "Indian").voiceId)?.accent).toBe("Indian");
    expect(findTrialVoice(resolveTrialPersona(null, "Joe's Pizza").voiceId)?.accent).toBe("Italian");
    expect(findTrialVoice(resolveTrialPersona(null, "Taco Pizza Palace", "Mexican").voiceId)?.accent).toBe("Latin American");
  });

  it("keeps an owner-picked voice and name over the cuisine match", () => {
    expect(resolveTrialPersona({ voiceId: "UgBBYS2sOqTuMpoF3BR0" }, "Eggmania", "Indian")).toMatchObject({
      agentName: "Mark",
      voiceLabel: "Mark",
    });
    expect(resolveTrialPersona({ agentName: "Priya" }, "Eggmania", "Indian").agentName).toBe("Priya");
  });

  it("keeps a valid stored persona and trims whitespace", () => {
    expect(
      resolveTrialPersona({ agentName: "  Maya ", voiceId: "MzqUf1HbJ8UmQ0wUsx2p", language: " es " }, "X")
    ).toEqual({ agentName: "Maya", voiceId: "MzqUf1HbJ8UmQ0wUsx2p", voiceLabel: "Katie", language: "es" });
  });

  it("ignores an unknown voice id and a stale label", () => {
    const persona = resolveTrialPersona({ agentName: "", voiceId: "bogus", voiceLabel: "Stale", language: "" }, "X");
    expect(findTrialVoice(persona.voiceId)?.accent).toBe("American");
    expect(persona.voiceLabel).not.toBe("Stale");
    expect(persona.language).toBe("en");
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
    for (const v of TRIAL_VOICE_OPTIONS) {
      expect(v.libraryOwnerId).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
