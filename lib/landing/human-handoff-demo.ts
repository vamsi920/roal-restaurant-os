/** Human handoff story — illustrative edge cases for landing. */

export type HandoffEdgeCaseId =
  | "catering"
  | "angry-customer"
  | "allergy"
  | "manager";

export type HandoffEdgeCase = {
  id: HandoffEdgeCaseId;
  title: string;
  callerQuote: string;
  agentResponse: string;
  routeLabel: string;
};

export const HUMAN_HANDOFF_DEMO = {
  eyebrow: "Human handoff",
  title: "Edge cases go to your team—not deeper AI improv",
  lead: "Standard pickup orders are the sweet spot. When a caller needs catering, has an allergy protocol, is upset, or wants a manager, ROAL says so plainly and routes the call instead of guessing.",
  edgeCases: [
    {
      id: "catering",
      title: "Catering request",
      callerQuote: "I need trays for forty people this Friday—what do you charge?",
      agentResponse:
        "That is larger than I can quote on the phone. I will flag our catering contact to call you back with options.",
      routeLabel: "Catering / events",
    },
    {
      id: "angry-customer",
      title: "Angry customer",
      callerQuote: "My order was wrong last time and nobody called me back.",
      agentResponse:
        "I am sorry that happened. I cannot redo that charge on this line—let me have a manager reach you.",
      routeLabel: "Manager callback",
    },
    {
      id: "allergy",
      title: "Allergy concern",
      callerQuote:
        "My child has a severe shellfish allergy—can you guarantee no cross-contact?",
      agentResponse:
        "I need our kitchen lead to confirm that protocol—I will not guess. Can someone call you back?",
      routeLabel: "Kitchen / manager",
    },
    {
      id: "manager",
      title: "Manager question",
      callerQuote: "Are you the owner? I need to talk about last week's invoice.",
      agentResponse:
        "I handle phone orders only. Let me take your number for a manager callback.",
      routeLabel: "Manager",
    },
  ] satisfies HandoffEdgeCase[],
  aiHandles: ["Menu questions & modifiers", "Cart sync to your kitchen screen", "Pickup timing & readback"],
  staffHandles: [
    "Catering & large parties",
    "Complaints & refunds",
    "Allergy protocols beyond the menu",
    "Manager or billing questions",
  ],
  honesty:
    "Escalation rules live in your restaurant profile—ROAL never pretends to be a manager or invents allergen guarantees.",
} as const;
