import { METRICS_PILOT_DISCLAIMER } from "@/lib/landing/metrics-safety";

/** Social proof placeholders — pilot metric categories only, no fake logos or invented %. */

export type PilotMetricId =
  | "missed-calls-recovered"
  | "confirmed-orders"
  | "staff-interruptions"
  | "order-accuracy";

export type PilotMetric = {
  id: PilotMetricId;
  title: string;
  body: string;
  unit: string;
};

export const SOCIAL_PROOF_DEMO = {
  eyebrow: "Pilot partners",
  title: "What we measure with you—not made-up logos",
  lead: "Early independents are running guided pilots. Instead of stock testimonials, we track a short list of line-level metrics and review them with your team before and after go-live.",
  metrics: [
    {
      id: "missed-calls-recovered",
      title: "Missed calls recovered",
      body: "Rings we track during pilot that used to go to voicemail but end with a confirmed cart after ROAL answers.",
      unit: "calls / rush week",
    },
    {
      id: "confirmed-orders",
      title: "Confirmed orders",
      body: "Pickup tickets we count during pilot with real name and phone—not abandoned drafts or hang-ups.",
      unit: "orders / week",
    },
    {
      id: "staff-interruptions",
      title: "Staff interruptions reduced",
      body: "How often expo or counter stops plating to answer—we track the pattern during pilot, not a fixed % for every shop.",
      unit: "interruptions / shift",
    },
    {
      id: "order-accuracy",
      title: "Order accuracy reviews",
      body: "Items and modifiers compared to what the guest asked for—your team flags fixes; we do not publish a universal accuracy percentage.",
      unit: "reviewed on pilot calls",
    },
  ] satisfies PilotMetric[],
  placeholderLabel: "Your baseline → pilot target (example)",
  honesty: METRICS_PILOT_DISCLAIMER,
  quotePlaceholder: {
    label: "Operator note (optional during pilot)",
    hint: "We will add a short quote from your team when you are ready—never a stock testimonial.",
  },
} as const;
