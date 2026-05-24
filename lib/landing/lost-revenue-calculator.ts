/** Illustrative presets for landing calculator — not live customer data. */

export type LostRevenuePreset = {
  id: string;
  label: string;
  description: string;
  missedCallsPerWeek: number;
  /** Example share of missed callers who would have placed pickup if answered. */
  wouldOrderRate: number;
  avgTicket: number;
};

export const LOST_REVENUE_PRESETS: readonly LostRevenuePreset[] = [
  {
    id: "light",
    label: "Slow Tuesday",
    description: "A handful of rings go to voicemail between rushes.",
    missedCallsPerWeek: 6,
    wouldOrderRate: 0.4,
    avgTicket: 22,
  },
  {
    id: "busy",
    label: "Busy weeknight",
    description: "Pickup line busy; second and third rings stack up.",
    missedCallsPerWeek: 14,
    wouldOrderRate: 0.5,
    avgTicket: 28,
  },
  {
    id: "rush",
    label: "Friday rush",
    description: "Dining room and counter full; phones ring unanswered.",
    missedCallsPerWeek: 22,
    wouldOrderRate: 0.55,
    avgTicket: 32,
  },
] as const;

export type LostRevenueEstimate = {
  missedCallsPerWeek: number;
  missedOrdersPerWeek: number;
  missedRevenuePerWeek: number;
  missedRevenuePerMonth: number;
};

export function estimateLostRevenue(preset: LostRevenuePreset): LostRevenueEstimate {
  const missedOrdersPerWeek = Math.round(preset.missedCallsPerWeek * preset.wouldOrderRate);
  const missedRevenuePerWeek = missedOrdersPerWeek * preset.avgTicket;
  return {
    missedCallsPerWeek: preset.missedCallsPerWeek,
    missedOrdersPerWeek,
    missedRevenuePerWeek,
    missedRevenuePerMonth: Math.round(missedRevenuePerWeek * 4.33),
  };
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(rate: number) {
  return `${Math.round(rate * 100)}%`;
}
