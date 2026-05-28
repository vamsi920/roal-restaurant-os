export type AnalyticsRangeKey = "7d" | "30d" | "90d";

export type DailyOrderPoint = {
  date: string;
  voiceOrders: number;
  completed: number;
  canceled: number;
};

export type PopularItemRow = {
  name: string;
  quantity: number;
  orderCount: number;
};

export type RestaurantAnalyticsRow = {
  restaurantId: string;
  restaurantName: string;
  voiceOrders: number;
  finalized: number;
  completed: number;
  canceled: number;
  conversionPercent: number | null;
  revenueCents: number | null;
  revenueComplete: boolean;
  avgPrepMinutes: number | null;
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
    voiceOrders: number;
    ordersFinalized: number;
    ordersCompleted: number;
    ordersCanceled: number;
    conversionPercent: number | null;
    avgPrepMinutes: number | null;
    prepSampleSize: number;
    revenueCents: number | null;
    revenueComplete: boolean;
    revenueOrderCount: number;
  };
  ordersOverTime: DailyOrderPoint[];
  popularItems: PopularItemRow[];
  byRestaurant: RestaurantAnalyticsRow[];
  menuScans: MenuScanStats;
};
