export type HowFlowBeatId = "share-menu" | "connect-line" | "kitchen-orders";

export type HowFlowBeat = {
  id: HowFlowBeatId;
  step: number;
  title: string;
  body: string;
};

export const HOME_HOW_FLOW = {
  eyebrow: "Three steps",
  title: "How it works",
  lead: "Menu, phone line, ROAL answers. Orders reach the kitchen.",
  visualLabel: "Preview",
  beats: [
    {
      id: "share-menu",
      step: 1,
      title: "Your menu",
      body: "Items and prices ROAL uses on every pickup call.",
    },
    {
      id: "connect-line",
      step: 2,
      title: "Your phone line",
      body: "Forward your restaurant number so ROAL answers rings.",
    },
    {
      id: "kitchen-orders",
      step: 3,
      title: "ROAL answers",
      body: "Pickup confirmed on the call; orders reach your kitchen screen.",
    },
  ] satisfies HowFlowBeat[],
} as const;

export const HOME_HOW_FLOW_LABELS = HOME_HOW_FLOW.beats.map((b) => b.title);
