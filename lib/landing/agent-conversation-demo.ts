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
  restaurant: "Joe's Corner Kitchen",
  scenario: "Friday pickup · illustrative transcript",
  lines: [
    {
      id: "1",
      speaker: "agent",
      text: "Thanks for calling Joe's Corner Kitchen—this is our pickup line. Ordering for pickup today?",
    },
    {
      id: "2",
      speaker: "guest",
      text: "Yeah, pickup. I wanted the spicy tuna poke—",
    },
    {
      id: "3",
      speaker: "guest",
      text: "Actually—can I add a miso soup too?",
      beat: "interrupt",
    },
    {
      id: "4",
      speaker: "agent",
      text: "Absolutely. For the poke, did you want extra tuna? That's fifty cents on your menu.",
      beat: "modifier",
    },
    {
      id: "5",
      speaker: "guest",
      text: "Yes, extra tuna. And mild spice, not the hot level.",
    },
    {
      id: "6",
      speaker: "agent",
      text: "Mild spice—got it. Anything else, or should I read back what I have so far?",
      beat: "clarify",
    },
    {
      id: "7",
      speaker: "guest",
      text: "That's everything.",
    },
    {
      id: "8",
      speaker: "agent",
      text: "Got it. One spicy tuna poke, extra tuna, mild spice, and one miso soup for pickup. Name and phone number when you're ready?",
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
