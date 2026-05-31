export type UpsellOutcomeCounts = {
  suggested: number;
  accepted: number;
  skipped: number;
};

export function upsellOutcomeCounts(input: {
  eligibleOrders: number;
  attachedOrders: number;
}): UpsellOutcomeCounts {
  const suggested = Math.max(0, input.eligibleOrders);
  const accepted = Math.max(0, Math.min(input.attachedOrders, suggested));
  return {
    suggested,
    accepted,
    skipped: Math.max(0, suggested - accepted),
  };
}
