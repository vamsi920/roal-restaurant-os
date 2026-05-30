export type AnalyticsRangeKey = "7d" | "30d" | "90d";

export type DailyOrderPoint = {
  date: string;
  /** Unique order sessions with activity that day (drafts, receipts, usage). */
  orderSessions: number;
  /** Receipts finalized or order_completed usage that day. */
  completed: number;
  canceled: number;
};

export type PeakHourRow = {
  hourUtc: number;
  label: string;
  orderCount: number;
};

export type ConversionTrend = {
  label: string;
  priorPercent: number | null;
  recentPercent: number | null;
  deltaPoints: number | null;
  priorSessions: number;
  recentSessions: number;
  priorCompleted: number;
  recentCompleted: number;
};

export type PopularItemRow = {
  name: string;
  quantity: number;
  orderCount: number;
};

export type RestaurantAnalyticsRow = {
  restaurantId: string;
  restaurantName: string;
  orderSessions: number;
  sessionsCompleted: number;
  finalized: number;
  completedKitchen: number;
  canceled: number;
  conversionPercent: number | null;
  revenueCents: number | null;
  revenueComplete: boolean;
  avgPrepMinutes: number | null;
  stuckOrders: number;
};

export type MenuScanStats = {
  attempts: number;
  extracted: number;
  committed: number;
  failed: number;
  successPercent: number | null;
};

export type AnalyticsScope = "organization" | "restaurant";

export type AnalyticsSnapshot = {
  organizationId: string;
  organizationName: string;
  scope: AnalyticsScope;
  restaurantId: string | null;
  restaurantName: string | null;
  rangeKey: AnalyticsRangeKey;
  since: string;
  until: string;
  restaurantCount: number;
  summary: {
    orderSessions: number;
    sessionsWithCompletedOrder: number;
    sessionConversionPercent: number | null;
    ordersFinalized: number;
    completedKitchenOrders: number;
    ordersCanceled: number;
    avgPrepMinutes: number | null;
    prepSampleSize: number;
    revenueCents: number | null;
    revenueComplete: boolean;
    revenueOrderCount: number;
    averageOrderCents: number | null;
    averageOrderComplete: boolean;
    averageOrderSampleSize: number;
    stuckOrderCount: number;
  };
  ordersOverTime: DailyOrderPoint[];
  peakHours: PeakHourRow[];
  conversionTrend: ConversionTrend;
  popularItems: PopularItemRow[];
  byRestaurant: RestaurantAnalyticsRow[];
  menuScans: MenuScanStats;
};
