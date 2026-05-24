/** Client-side helper: report Realtime fallback (debounced per hour). */
export function reportRealtimeDegraded(input: {
  restaurantId: string;
  restaurantName: string;
}): void {
  const hour = new Date().toISOString().slice(0, 13);
  const key = `roal:rt-degraded:${input.restaurantId}:${hour}`;
  if (typeof window !== "undefined" && sessionStorage.getItem(key)) {
    return;
  }
  sessionStorage.setItem(key, "1");

  void fetch("/api/notifications/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "realtime_degraded",
      restaurant_id: input.restaurantId,
      restaurant_name: input.restaurantName,
      title: `Realtime degraded · ${input.restaurantName}`,
      body: "Live orders are polling every few seconds until the Realtime connection recovers.",
      idempotency_key: `realtime_degraded:${input.restaurantId}:${hour}`,
    }),
  }).catch(() => {
    /* best-effort */
  });
}
