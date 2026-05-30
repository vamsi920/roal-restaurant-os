export type HowFlowBeatId = "share-menu" | "connect-line" | "kitchen-orders";

export type HowFlowBeat = {
  id: HowFlowBeatId;
  step: number;
  title: string;
  body: string;
};

export const HOME_HOW_FLOW = {
  eyebrow: "How it works",
  title: "From menu to live calls in one simple flow.",
  lead: "For owners: add the menu, test the agent, then forward rush-hour calls.",
  visualLabel: "Preview",
  beats: [
    {
      id: "share-menu",
      step: 1,
      title: "Add your menu",
      body: "Items, prices, modifiers, hours, pickup timing, and sold-out notes.",
    },
    {
      id: "connect-line",
      step: 2,
      title: "Test the phone agent",
      body: "Try questions, substitutions, language changes, and noisy-call edge cases.",
    },
    {
      id: "kitchen-orders",
      step: 3,
      title: "Go live for rush",
      body: "Confirmed pickup orders land on the kitchen screen for your team.",
    },
  ] satisfies HowFlowBeat[],
} as const;

export const HOME_HOW_FLOW_LABELS = HOME_HOW_FLOW.beats.map((b) => b.title);
