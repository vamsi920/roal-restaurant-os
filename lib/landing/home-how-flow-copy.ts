export type HowFlowBeatId = "scan-menu" | "roal-answers" | "guest-orders" | "ticket-lands";

export type HowFlowBeat = {
  id: HowFlowBeatId;
  step: number;
  title: string;
  body: string;
};

export const HOME_HOW_FLOW = {
  eyebrow: "How it works",
  title: "Menu scan to kitchen ticket",
  lead: "Four steps in your first pilot week.",
  visualLabel: "Illustrative preview",
  beats: [
    {
      id: "scan-menu",
      step: 1,
      title: "Scan your menu",
      body: "Photo your printed menu—we turn it into items you can edit.",
    },
    {
      id: "roal-answers",
      step: 2,
      title: "ROAL answers",
      body: "Your line rings; ROAL picks up with a natural voice and your live menu.",
    },
    {
      id: "guest-orders",
      step: 3,
      title: "Guest orders",
      body: "They add items and confirm pickup—modifiers and prices from your menu.",
    },
    {
      id: "ticket-lands",
      step: 4,
      title: "Ticket on your pass",
      body: "Name, phone, and items on your kitchen screen—the same ticket your team plates from.",
    },
  ] satisfies HowFlowBeat[],
} as const;
