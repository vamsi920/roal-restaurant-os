import { METRICS_PILOT_DISCLAIMER } from "@/lib/landing/metrics-safety";

/** Homepage trust strip — category labels only, no fabricated totals. */

export const HOME_METRICS = {
  eyebrow: "Example pilot metrics",
  note: METRICS_PILOT_DISCLAIMER,
  items: [
    {
      id: "orders-recovered",
      title: "Orders recovered",
      body: "Pickup calls we track in pilot that would have been missed or voicemail—not industry averages.",
    },
    {
      id: "hours-saved",
      title: "Hours saved",
      body: "Rush-hour phone time in an example month—your baseline depends on how you staff today.",
    },
    {
      id: "staff-interruptions",
      title: "Fewer counter interruptions",
      body: "How often expo stops plating to answer—we track the pattern in pilot, not a fixed result for every shop.",
    },
  ],
} as const;
