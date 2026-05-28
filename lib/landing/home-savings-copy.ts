import { METRICS_EXAMPLE_DISCLAIMER } from "@/lib/landing/metrics-safety";

/** Illustrative missed-call math for homepage — not a savings guarantee. */

export const HOME_SAVINGS = {
  eyebrow: "Example math",
  title: "What missed rings can cost",
  lead: "Plug in your rush-hour numbers.",
  rows: [
    { label: "Calls that ring out (example)", value: "8", unit: "per week" },
    { label: "Would have ordered (example)", value: "50%", unit: "of those" },
    { label: "Average pickup (example)", value: "$35", unit: "per order" },
  ],
  result: {
    prefix: "Illustrative exposure",
    amount: "~$140",
    suffix: "per week if half those calls were orders",
  },
  note: `${METRICS_EXAMPLE_DISCLAIMER} Pilot reviews use your real call volume and menu.`,
} as const;
