/** Illustrative pickup call transcript for landing — not a real recording. */

export type TranscriptSpeaker = "guest" | "agent" | "system";

export type TranscriptLine = {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  /** Visual emphasis for story beats */
  beat?: "interrupt" | "clarify" | "modifier" | "confirm" | "disclosure";
};

export const AGENT_CONVERSATION_DEMO = {
  restaurant: "Napoli Pizza",
  scenario: "Friday pickup · illustrative transcript",
  lines: [
    {
      id: "1",
      speaker: "agent",
      text: "Thanks for calling Napoli Pizza. I can take your pickup order.",
    },
    {
      id: "2",
      speaker: "guest",
      text: "Can I place a pickup order in Spanish?",
    },
    {
      id: "3",
      speaker: "guest",
      text: "Two margherita pizzas and garlic knots.",
      beat: "interrupt",
    },
    {
      id: "4",
      speaker: "agent",
      text: "Claro. One pizza with no basil, one regular. Garlic knots with marinara?",
      beat: "modifier",
    },
    {
      id: "5",
      speaker: "guest",
      text: "Yes, add marinara. Pickup under Alex.",
    },
    {
      id: "6",
      speaker: "agent",
      text: "Got it. Your pickup total is $43.47 and it will be ready in about 18 minutes.",
      beat: "clarify",
    },
    {
      id: "7",
      speaker: "guest",
      text: "Perfect, thank you.",
    },
    {
      id: "8",
      speaker: "agent",
      text: "Confirmed. I sent the ticket to the kitchen with the no-basil note and marinara.",
      beat: "confirm",
    },
    {
      id: "9",
      speaker: "system",
      text: "Draft cart synced to your kitchen screen · guest still on the line",
    },
    {
      id: "10",
      speaker: "system",
      text: "ROAL pickup line · automated ordering, clearly disclosed",
      beat: "disclosure",
    },
  ] satisfies TranscriptLine[],
} as const;
