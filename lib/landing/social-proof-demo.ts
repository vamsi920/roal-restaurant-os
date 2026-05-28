import { ILLUSTRATIVE_PROCESS_NOTE } from "@/lib/landing/metrics-safety";

/** Pilot partner framing — capabilities we discuss in pilots, not published KPIs. */

export type PilotCapabilityId = "line-coverage" | "order-flow" | "kitchen-handoff";

export type PilotCapability = {
  id: PilotCapabilityId;
  title: string;
  body: string;
};

export const SOCIAL_PROOF_DEMO = {
  eyebrow: "Pilot conversations",
  title: "What we review with you—not stock logos",
  lead: "Guided pilots focus on how your line, menu, and kitchen screen work together—we do not publish customer counts or savings percentages.",
  capabilities: [
    {
      id: "line-coverage",
      title: "Line coverage plan",
      body: "Which rings forward to ROAL and when staff still pick up.",
    },
    {
      id: "order-flow",
      title: "Order flow on calls",
      body: "How guests confirm pickup with name, phone, and items.",
    },
    {
      id: "kitchen-handoff",
      title: "Kitchen handoff",
      body: "How confirmed tickets land on the screen your team uses.",
    },
  ] satisfies PilotCapability[],
  honesty: ILLUSTRATIVE_PROCESS_NOTE,
  quotePlaceholder: {
    label: "Operator note (optional during pilot)",
    hint: "We add a short quote when your team is ready—never a stock testimonial.",
  },
} as const;
