import { describe, expect, it } from "vitest";
import {
  scorecardProgress,
  scoreTranscript,
  TRIAL_SCORECARD_ITEMS,
} from "@/lib/trial/scorecard";
import type { TrialTranscriptTurn } from "@/lib/trial/types";

function turn(role: "agent" | "user", text: string, at = 0): TrialTranscriptTurn {
  return { role, text, at };
}

describe("scoreTranscript", () => {
  it("returns an empty scorecard for an empty transcript", () => {
    expect(scoreTranscript([])).toEqual({});
  });

  it("marks greeted as soon as the agent has spoken", () => {
    expect(scoreTranscript([turn("agent", "Hi, thanks for calling")])).toEqual({ greeted: true });
  });

  it("ignores agent turns when scoring user intents", () => {
    const result = scoreTranscript([
      turn("agent", "What would you like to order from our menu? We close at 10."),
    ]);
    expect(result).toEqual({ greeted: true });
  });

  it("detects a menu question", () => {
    const result = scoreTranscript([turn("user", "What do you have that's vegetarian?")]);
    expect(result.menu_question).toBe(true);
    expect(result.placed_order).toBeUndefined();
  });

  it("detects an order", () => {
    const result = scoreTranscript([turn("user", "I'd like two margherita pizzas please")]);
    expect(result.placed_order).toBe(true);
  });

  it("detects a modifier request", () => {
    const result = scoreTranscript([turn("user", "Make that extra spicy, no onions")]);
    expect(result.modifier).toBe(true);
  });

  it("detects an hours question", () => {
    const result = scoreTranscript([turn("user", "What time do you close tonight?")]);
    expect(result.hours_question).toBe(true);
  });

  it("detects a request for a person", () => {
    const result = scoreTranscript([turn("user", "Can I talk to the manager?")]);
    expect(result.ask_for_person).toBe(true);
  });

  it("merges into the previous scorecard without clearing earlier ticks", () => {
    const previous = scoreTranscript([turn("agent", "Hello"), turn("user", "What time do you close?")]);
    const next = scoreTranscript([turn("user", "Can I get one burger")], previous);
    expect(next).toEqual({ greeted: true, hours_question: true, placed_order: true });
    expect(previous).toEqual({ greeted: true, hours_question: true });
  });

  it("can tick every item from a full guided call", () => {
    const result = scoreTranscript([
      turn("agent", "Hi, thanks for calling"),
      turn("user", "Do you have anything vegan?"),
      turn("user", "I'll take one garden bowl and one lemonade"),
      turn("user", "Hold the onions please"),
      turn("user", "Are you open on Sunday?"),
      turn("user", "Can I speak to the owner?"),
    ]);
    expect(scorecardProgress(result)).toEqual({ done: TRIAL_SCORECARD_ITEMS.length, total: TRIAL_SCORECARD_ITEMS.length });
  });
});

describe("scorecardProgress", () => {
  it("counts only true items against the full checklist", () => {
    expect(scorecardProgress({})).toEqual({ done: 0, total: 6 });
    expect(scorecardProgress({ greeted: true, modifier: false })).toEqual({ done: 1, total: 6 });
    expect(scorecardProgress({ greeted: true, menu_question: true, placed_order: true })).toEqual({
      done: 3,
      total: 6,
    });
  });

  it("checklist ids are unique", () => {
    const ids = TRIAL_SCORECARD_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
