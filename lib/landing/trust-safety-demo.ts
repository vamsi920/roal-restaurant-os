/** Trust & safety copy for landing — plain language for operators. */

export type TrustPillarId =
  | "secure-data"
  | "scoped-tools"
  | "real-guest-info"
  | "human-handoff"
  | "order-trail";

export type TrustPillar = {
  id: TrustPillarId;
  title: string;
  body: string;
};

export const TRUST_SAFETY_DEMO = {
  eyebrow: "Trust & safety",
  title: "Your menu, your guests, your kitchen",
  lead: "ROAL handles real names, real phones, and real pickup tickets. Nothing here needs a IT degree—we spell out how your data stays put and your team stays in charge.",
  pillars: [
    {
      id: "secure-data",
      title: "Secure menu and order data",
      body: "Your menu, prices, and guest orders live in your own account—not mixed with other restaurants. Staff sign in; only your team sees your locations.",
    },
    {
      id: "scoped-tools",
      title: "Scoped to each restaurant",
      body: "ROAL can only read and update the menu and carts for the location you connected. It cannot wander into another shop’s data.",
    },
    {
      id: "real-guest-info",
      title: "No invented customer info",
      body: "An order is not finalized until the caller gives a real name and phone number on the line. ROAL does not guess or fabricate guest details to “complete” a ticket.",
    },
    {
      id: "human-handoff",
      title: "Human handoff when it matters",
      body: "Catering, complaints, allergy edge cases, and manager requests are routed to your staff—not handled with made-up answers.",
    },
    {
      id: "order-trail",
      title: "Audit-ready order trail",
      body: "Draft carts, status changes, and finalized pickups are recorded so you can see what happened on a ticket—useful for training, disputes, and busy-night reviews.",
    },
  ] satisfies TrustPillar[],
  securityLink: {
    href: "/security",
    label: "Technical security details for your team or POS partner",
  },
  pilotNote:
    "Pilots get a short go-live checklist—staff accounts, voice connection, and a test call—before you forward live guest traffic.",
} as const;
