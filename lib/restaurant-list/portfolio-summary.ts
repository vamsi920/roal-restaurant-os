import type {
  PortfolioSummary,
  RestaurantCardStats,
} from "@/lib/restaurant-list/types";

export function buildPortfolioSummary(
  statsByRestaurantId: Record<string, RestaurantCardStats>
): PortfolioSummary {
  const stats = Object.values(statsByRestaurantId);

  return {
    totalLocations: stats.length,
    locationsReadyForCalls: stats.filter((row) => row.readyForCalls).length,
    activeCallsNow: stats.reduce((sum, row) => sum + row.activeCallCount, 0),
    successfulOrdersInPeriod: stats.reduce(
      (sum, row) => sum + row.successfulOrdersInPeriod,
      0
    ),
    openFollowUps: stats.reduce((sum, row) => sum + row.openFollowUpCount, 0),
    openReservationRequests: stats.reduce(
      (sum, row) => sum + row.openReservationCount,
      0
    ),
    locationsNeedingAttention: stats.filter((row) => row.needsSetupAttention)
      .length,
  };
}
