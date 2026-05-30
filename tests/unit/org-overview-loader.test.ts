import { describe, expect, it, vi } from "vitest";
import { loadOrganizationOverview } from "@/lib/org-overview/load-org-overview";

function chain(result: { data: unknown; error: unknown }) {
  const self = {
    select: () => self,
    eq: () => self,
    in: () => self,
    order: () => self,
    then(
      onfulfilled?: (v: typeof result) => unknown,
      onrejected?: (e: unknown) => unknown
    ) {
      return Promise.resolve(result).then(onfulfilled, onrejected);
    },
  };
  return self;
}

describe("loadOrganizationOverview", () => {
  it("aggregates profiles, orders, and blockers per restaurant", async () => {
    const restaurantId = "r1";
    const supabase = {
      from(table: string) {
        if (table === "restaurants") {
          return chain({
            data: [{ id: restaurantId, name: "Main St" }],
            error: null,
          });
        }
        if (table === "restaurant_profiles") {
          return chain({
            data: [
              {
                restaurant_id: restaurantId,
                elevenlabs_agent_id: "agent-abc123456789",
                elevenlabs_provision_status: "ready",
                elevenlabs_provision_error: null,
                elevenlabs_menu_auto_sync_status: "succeeded",
                elevenlabs_menu_auto_sync_error: null,
                elevenlabs_last_sync_at: "2026-05-30T12:00:00.000Z",
                elevenlabs_last_sync_error: null,
              },
            ],
            error: null,
          });
        }
        if (table === "draft_orders") {
          return chain({
            data: [
              {
                restaurant_id: restaurantId,
                status: "new",
                updated_at: new Date(Date.now() - 30 * 60_000).toISOString(),
              },
            ],
            error: null,
          });
        }
        if (table === "categories") {
          return chain({
            data: [{ id: "c1", restaurant_id: restaurantId }],
            error: null,
          });
        }
        if (table === "items") {
          return chain({
            data: [{ id: "i1", category_id: "c1" }],
            error: null,
          });
        }
        if (table === "restaurant_weekly_hours") {
          return chain({
            data: [{ restaurant_id: restaurantId }],
            error: null,
          });
        }
        return chain({ data: [], error: null });
      },
    };

    const snapshot = await loadOrganizationOverview(
      supabase as never,
      {
        organizationId: "o1",
        organizationName: "Test Org",
        role: "owner",
      }
    );

    expect(snapshot.totals.locationCount).toBe(1);
    expect(snapshot.totals.activeOrders).toBe(1);
    expect(snapshot.totals.stuckOrders).toBe(1);
    expect(snapshot.restaurants[0]?.agentConfigured).toBe(true);
    expect(snapshot.restaurants[0]?.menuItemCount).toBe(1);
    expect(snapshot.restaurants[0]?.launchBlockers).toHaveLength(0);
    expect(snapshot.restaurants[0]?.links.liveOrders).toContain(restaurantId);
  });
});
