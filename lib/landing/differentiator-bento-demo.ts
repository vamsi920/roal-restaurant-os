/** Differentiator bento tiles for landing — illustrative mini visuals. */

export type DifferentiatorVisualId =
  | "call-flow"
  | "menu-truth"
  | "kds-sync"
  | "success-pricing"
  | "rush-hour"
  | "handoff";

export type DifferentiatorTile = {
  id: DifferentiatorVisualId;
  title: string;
  body: string;
  /** Tailwind grid placement on lg+ */
  gridClass: string;
};

export const DIFFERENTIATOR_BENTO = {
  eyebrow: "Why ROAL",
  title: "One stack for the rush-hour phone line",
  lead: "Six things that matter to independents—each tied to a real screen in the product, not a generic icon grid.",
  tiles: [
    {
      id: "call-flow",
      title: "Human-like call flow",
      body: "Short clarifications, modifier readbacks, and transparent AI—not a phone tree.",
      gridClass: "lg:col-span-7 lg:row-span-2",
    },
    {
      id: "menu-truth",
      title: "Live menu truth",
      body: "Scan once; phone orders and your kitchen screen read the same items, prices, and sold-out flags.",
      gridClass: "lg:col-span-5 lg:row-span-2",
    },
    {
      id: "kds-sync",
      title: "Kitchen screen sync",
      body: "Draft carts hit the pass while the guest is still on the line.",
      gridClass: "lg:col-span-4",
    },
    {
      id: "success-pricing",
      title: "Successful-order pricing",
      body: "Bill around completed pickups—not every ring or abandoned cart.",
      gridClass: "lg:col-span-4",
    },
    {
      id: "rush-hour",
      title: "Rush-hour concurrency",
      body: "Answer overflow rings while your team plates and bags.",
      gridClass: "lg:col-span-4",
    },
    {
      id: "handoff",
      title: "Staff handoff",
      body: "Catering, complaints, and manager requests escalate to your team.",
      gridClass: "lg:col-span-12",
    },
  ] satisfies DifferentiatorTile[],
} as const;
