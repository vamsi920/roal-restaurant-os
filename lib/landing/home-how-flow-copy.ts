export type HowFlowBeatId = "share-menu" | "connect-line" | "kitchen-orders";

export type HowFlowBeat = {
  id: HowFlowBeatId;
  step: number;
  title: string;
  body: string;
};

export const HOME_HOW_FLOW = {
  eyebrow: "How it works",
  title: "Go from menu to live phone coverage without changing how guests order.",
  lead: "Keep the setup plain: load the menu, test the call, forward the line when you trust the flow.",
  visualLabel: "Preview",
  beats: [
    {
      id: "share-menu",
      step: 1,
      title: "Load the real menu",
      body: "Items, prices, modifiers, hours, sold-out notes, and pickup timing become the source ROAL uses on calls.",
    },
    {
      id: "connect-line",
      step: 2,
      title: "Test it like a customer",
      body: "Call in, switch languages, change items, ask questions, and approve how ROAL responds before going live.",
    },
    {
      id: "kitchen-orders",
      step: 3,
      title: "Forward rush-hour calls",
      body: "Confirmed pickup orders show guest name, items, notes, total, and pickup time on the kitchen screen.",
    },
  ] satisfies HowFlowBeat[],
} as const;

export const HOME_HOW_FLOW_LABELS = HOME_HOW_FLOW.beats.map((b) => b.title);
