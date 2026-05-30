import { beforeEach, describe, expect, it, vi } from "vitest";
import { stateTransitioned } from "@/lib/notifications/operational-events";

vi.mock("@/lib/notifications/dispatch", () => ({
  dispatchNotification: vi.fn(),
}));

vi.mock("@/lib/observability/audit", () => ({
  writeAuditLog: vi.fn(),
}));

import { dispatchNotification } from "@/lib/notifications/dispatch";
import { writeAuditLog } from "@/lib/observability/audit";
import {
  emitGoLiveIfTransition,
  emitMenuAutoSyncFailureIfTransition,
  emitProvisionFailureIfTransition,
} from "@/lib/notifications/operational-events";

describe("stateTransitioned", () => {
  it("fires only when entering target state", () => {
    expect(stateTransitioned("pending", "failed", "failed")).toBe(true);
    expect(stateTransitioned("failed", "failed", "failed")).toBe(false);
    expect(stateTransitioned(null, "failed", "failed")).toBe(true);
    expect(stateTransitioned("failed", "ready", "failed")).toBe(false);
  });
});

describe("operational event emitters", () => {
  const orgId = "11111111-1111-4111-8111-111111111111";
  const restaurantId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dispatchNotification).mockResolvedValue(true);
  });

  it("skips provision failure when already failed", async () => {
    const sent = await emitProvisionFailureIfTransition({} as never, {
      restaurantId,
      organizationId: orgId,
      restaurantName: "Test",
      previousProvisionStatus: "failed",
      phase: "provision",
      message: "Clone failed",
    });
    expect(sent).toBe(false);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("dispatches provision failure on transition to failed", async () => {
    const sent = await emitProvisionFailureIfTransition({} as never, {
      restaurantId,
      organizationId: orgId,
      restaurantName: "Test",
      previousProvisionStatus: "provisioning",
      phase: "provision",
      message: "Clone failed",
    });
    expect(sent).toBe(true);
    expect(dispatchNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "provision_failure",
        idempotencyKey: `provision_failure:${restaurantId}`,
      })
    );
    expect(writeAuditLog).toHaveBeenCalled();
  });

  it("dispatches menu auto-sync failure once per failed episode", async () => {
    await emitMenuAutoSyncFailureIfTransition({} as never, {
      restaurantId,
      organizationId: orgId,
      restaurantName: "Test",
      previousMenuAutoSyncStatus: "syncing",
      message: "KB upload failed",
      trigger: "menu",
    });
    expect(dispatchNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "menu_auto_sync_failure",
        idempotencyKey: `menu_auto_sync_failure:${restaurantId}`,
      })
    );
  });

  it("dispatches go-live only when step newly completed", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: restaurantId,
                name: "Test",
                organization_id: orgId,
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    const skipped = await emitGoLiveIfTransition(supabase as never, {
      restaurantId,
      organizationId: orgId,
      previousGoLiveStatus: "completed",
    });
    expect(skipped).toBe(false);

    const sent = await emitGoLiveIfTransition(supabase as never, {
      restaurantId,
      organizationId: orgId,
      previousGoLiveStatus: "pending",
      userId: "user-1",
    });
    expect(sent).toBe(true);
    expect(dispatchNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: "go_live",
        idempotencyKey: `go_live:${restaurantId}`,
      })
    );
    expect(writeAuditLog).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ action: "restaurant.go_live", outcome: "success" })
    );
  });
});
