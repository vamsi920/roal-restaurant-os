import { ILLUSTRATIVE_WEEK_LABEL, METRICS_EXAMPLE_DISCLAIMER } from "@/lib/landing/metrics-safety";
import { PRICING_ORDER_EXPLAINER } from "@/lib/landing/pricing-core";
import { PRICING_CTA } from "@/lib/landing/pricing-page-copy";

/** Illustrative success-pricing story copy — not a live rate card. */

export const SUCCESS_PRICING_DEMO = {
  headline: "$0.90 per successful order",
  subhead: `${PRICING_ORDER_EXPLAINER.payLine} ${PRICING_ORDER_EXPLAINER.noPayLine}`,

  funnel: [
    { id: "rings", label: "Calls & rings", count: "42", billable: false, note: "Overflow, tests, hang-ups" },
    { id: "carts", label: "Live carts", count: "18", billable: false, note: "Chatter & abandoned drafts" },
    { id: "done", label: "Completed pickups", count: "11", billable: true, note: "Ticket on your kitchen screen" },
  ] as const,

  notCharged: [...PRICING_ORDER_EXPLAINER.noPayExamples],

  countsAsSuccess: [...PRICING_ORDER_EXPLAINER.payExamples],

  pilotNote:
    "Self-serve checkout is still rolling out. Pilots agree on simple success-based terms up front—no surprise per-minute phone bills.",

  honesty: `${ILLUSTRATIVE_WEEK_LABEL}. ${METRICS_EXAMPLE_DISCLAIMER} Your pilot metrics and pricing are defined together before go-live.`,

  visual: {
    periodLabel: ILLUSTRATIVE_WEEK_LABEL,
    callAttempts: 42,
    confirmedOrders: 11,
    invoice: {
      title: "Pilot statement preview",
      period: "Sample period · illustrative",
      lines: [
        {
          label: "Phone ordering & kitchen screen",
          detail: "Pilot onboarding bundle",
          amount: "Agreed in pilot",
        },
        {
          label: "Successful pickup orders",
          detail: "Completed on your kitchen screen with guest name & phone",
          quantity: 11,
          amount: "Per-order rate",
          highlight: true,
        },
      ],
      excludedNote: "No charges for rings, wrong numbers, tests, or abandoned carts",
    },
    staffCompare: {
      disclaimer:
        "Wages and schedules vary by restaurant. This compares models—we do not publish guaranteed dollar savings.",
      traditional: {
        title: "Hiring phone staff",
        points: [
          "Fixed labor cost every week",
          "Coverage gaps when the line is slammed",
          "Training on menu changes each season",
        ],
      },
      roal: {
        title: "ROAL success pricing",
        points: [
          "Value tied to orders that finalize",
          "No bill for experiments or hang-ups",
          "Same menu truth on calls and your kitchen screen",
        ],
      },
    },
    pilotCta: {
      primary: PRICING_CTA.primary,
      secondary: PRICING_CTA.secondary,
    },
  },
} as const;
