/**
 * The /start funnel's "what missed calls cost you" estimate. Built only from the owner's
 * own answers (no industry stats we can't source), and labelled as a rough estimate.
 */

export const MISSED_CALL_OPTIONS = [
  { id: "few", label: "A few", detail: "1–5 a night", perNight: 3 },
  { id: "some", label: "Quite a few", detail: "5–15 a night", perNight: 10 },
  { id: "many", label: "A lot", detail: "15+ a night", perNight: 18 },
  { id: "unsure", label: "Honestly, no idea", detail: "We'll assume a few", perNight: 3 },
] as const;

export const TICKET_OPTIONS = [
  { id: "t15", label: "$15–25", mid: 20 },
  { id: "t25", label: "$25–40", mid: 32 },
  { id: "t40", label: "$40–60", mid: 50 },
  { id: "t60", label: "$60+", mid: 70 },
] as const;

export type MissedCallId = (typeof MISSED_CALL_OPTIONS)[number]["id"];
export type TicketId = (typeof TICKET_OPTIONS)[number]["id"];

/** Busy nights per week we count (Thu–Sun). */
export const BUSY_NIGHTS_PER_WEEK = 4;
/** Share of missed callers we assume would have ordered. Conservative on purpose. */
export const ORDER_SHARE = 0.5;

export type MissedCallEstimate = {
  missedPerWeek: number;
  ordersPerWeek: number;
  weekly: number;
  monthly: number;
  roalMonthlyCost: number;
};

export function estimateMissedRevenue(
  missed: MissedCallId | undefined,
  ticket: TicketId | undefined,
  pricePerOrder = 0.9
): MissedCallEstimate {
  const perNight = MISSED_CALL_OPTIONS.find((o) => o.id === missed)?.perNight ?? 3;
  const mid = TICKET_OPTIONS.find((o) => o.id === ticket)?.mid ?? 32;
  const missedPerWeek = perNight * BUSY_NIGHTS_PER_WEEK;
  const ordersPerWeek = Math.max(1, Math.round(missedPerWeek * ORDER_SHARE));
  const weekly = Math.round(ordersPerWeek * mid);
  const monthly = Math.round((weekly * 52) / 12);
  const roalMonthlyCost = Math.round(((ordersPerWeek * 52) / 12) * pricePerOrder);
  return { missedPerWeek, ordersPerWeek, weekly, monthly, roalMonthlyCost };
}
