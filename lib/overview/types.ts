/** Per-location Overview home (`/dashboard/restaurants/[id]/overview`). */

export type OverviewDayPoint = {
  /** YYYY-MM-DD in the restaurant's timezone. */
  date: string;
  calls: number;
  orders: number;
};

export type OverviewActivityKind = "live" | "order" | "followup" | "call";

export type OverviewActivityItem = {
  id: string;
  kind: OverviewActivityKind;
  /** Masked caller phone, e.g. "(512) •••-7437". */
  title: string;
  /** Customer name, intent ("Order", "Question") or "Recent caller". */
  subtitle: string;
  /** Formatted order total for completed orders, when pricing resolved. */
  amountLabel: string | null;
  /** Short follow-up reason when staff should call back. */
  reason: string | null;
  occurredAt: string;
};

export type OverviewMonthStats = {
  /** Estimated revenue of completed phone orders this calendar month (cents). */
  revenueCents: number;
  /** False when some order lines could not be priced from the menu. */
  revenueComplete: boolean;
  ordersTaken: number;
  callsAnswered: number;
  /** Sum of call_duration_secs reported by the voice provider. */
  handledSeconds: number;
  upsellRules: number;
  upsellAttachedOrders: number;
  upsellRevenueCents: number;
};

export type OverviewChecklistItem = {
  id: string;
  label: string;
  status: "ok" | "pending" | "error";
  detail: string | null;
  href: string;
  /** ROAL handles this step; show "setting up" instead of a to-do. */
  automatic?: boolean;
};

export type OverviewLaunch = {
  isLive: boolean;
  completedCount: number;
  totalCount: number;
  items: OverviewChecklistItem[];
  primaryAction: { label: string; href: string } | null;
};

export type OverviewSnapshot = {
  restaurantId: string;
  restaurantName: string;
  timezone: string;
  hostName: string;
  monthLabel: string;
  month: OverviewMonthStats;
  series: OverviewDayPoint[];
  activity: OverviewActivityItem[];
  launch: OverviewLaunch | null;
  /** Non-fatal load problems (logged; page still renders). */
  warnings: string[];
};
