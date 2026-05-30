import { beforeEach, describe, expect, it, vi } from "vitest";
import { RESTAURANT_ID } from "../fixtures/menu";
import {
  createMockSyncSupabase,
  MOCK_AGENT_ID,
  mockRunSyncSuccess,
  mockSyncResult,
} from "../helpers/mock-sync-restaurant-agent";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CATEGORY_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const syncRestaurantAgentAfterContentChange = vi.fn();
const revalidatePath = vi.fn();
const afterMenuContentMutationSpy = vi.fn();
const afterProfileSettingsMutationSpy = vi.fn();
const afterHoursSettingsMutationSpy = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/voice-agent/sync-restaurant-agent-after-content-change", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/voice-agent/sync-restaurant-agent-after-content-change")
  >("@/lib/voice-agent/sync-restaurant-agent-after-content-change");
  return {
    ...actual,
    syncRestaurantAgentAfterContentChange,
  };
});

function accessOk() {
  return {
    access: {
      restaurant: {
        id: RESTAURANT_ID,
        organization_id: ORG_ID,
        name: "Test Kitchen",
        slug: "test-kitchen",
        created_at: "",
        updated_at: "",
      },
      role: "owner" as const,
    },
    context: { user: { id: USER_ID } },
    errorResponse: null,
  };
}

describe("content-change auto-sync (pass 13)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncRestaurantAgentAfterContentChange.mockReset();
    revalidatePath.mockReset();
    afterMenuContentMutationSpy.mockReset();
    afterProfileSettingsMutationSpy.mockReset();
    afterHoursSettingsMutationSpy.mockReset();
  });

  describe("sync helper (mocked deps)", () => {
    it("persists failed status and error without throwing", async () => {
      const { syncRestaurantAgentAfterContentChange: syncFn } = await vi.importActual<
        typeof import("@/lib/voice-agent/sync-restaurant-agent-after-content-change")
      >("@/lib/voice-agent/sync-restaurant-agent-after-content-change");
      const { client, updates } = createMockSyncSupabase();
      const runSync = vi.fn().mockRejectedValue(new Error("ElevenLabs down"));

      const result = await syncFn(
        {
          restaurantId: RESTAURANT_ID,
          trigger: "menu",
          userId: USER_ID,
        },
        { getSupabase: async () => client as never, runSync }
      );

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/down/i);
      const failed = updates.find(
        (u) => u.elevenlabs_menu_auto_sync_status === "failed"
      );
      expect(failed?.elevenlabs_menu_auto_sync_error).toMatch(/down/i);
    });

    it("persists succeeded status and last sync timestamp", async () => {
      const { syncRestaurantAgentAfterContentChange: syncFn } = await vi.importActual<
        typeof import("@/lib/voice-agent/sync-restaurant-agent-after-content-change")
      >("@/lib/voice-agent/sync-restaurant-agent-after-content-change");
      const { client, updates } = createMockSyncSupabase();
      const runSync = vi.fn().mockResolvedValue(mockRunSyncSuccess());

      const result = await syncFn(
        {
          restaurantId: RESTAURANT_ID,
          trigger: "profile",
          restaurantName: "Test Kitchen",
        },
        { getSupabase: async () => client as never, runSync }
      );

      expect(result.ok).toBe(true);
      expect(updates.some((u) => u.elevenlabs_menu_auto_sync_status === "syncing")).toBe(
        true
      );
      expect(
        updates.some((u) => u.elevenlabs_menu_auto_sync_status === "succeeded")
      ).toBe(true);
      const success = updates.find(
        (u) => u.elevenlabs_menu_auto_sync_status === "succeeded"
      );
      expect(success?.elevenlabs_last_sync_at).toBeTruthy();
    });
  });

  describe("after* mutation wrappers", () => {
    it("afterMenuContentMutation calls sync with menu trigger", async () => {
      syncRestaurantAgentAfterContentChange.mockResolvedValue(
        mockSyncResult({ ok: true, trigger: "menu" })
      );
      const { afterMenuContentMutation } = await import(
        "@/lib/voice-agent/after-menu-content-mutation"
      );

      afterMenuContentMutation(RESTAURANT_ID, { userId: USER_ID });

      expect(syncRestaurantAgentAfterContentChange).toHaveBeenCalledWith({
        restaurantId: RESTAURANT_ID,
        trigger: "menu",
        userId: USER_ID,
        restaurantName: undefined,
      });
    });

    it("afterProfileSettingsMutation calls sync with profile trigger", async () => {
      syncRestaurantAgentAfterContentChange.mockResolvedValue(
        mockSyncResult({ ok: true, trigger: "profile" })
      );
      const { afterProfileSettingsMutation } = await import(
        "@/lib/voice-agent/after-restaurant-settings-mutation"
      );

      afterProfileSettingsMutation(RESTAURANT_ID, {
        userId: USER_ID,
        restaurantName: "Test Kitchen",
      });

      expect(syncRestaurantAgentAfterContentChange).toHaveBeenCalledWith({
        restaurantId: RESTAURANT_ID,
        trigger: "profile",
        userId: USER_ID,
        restaurantName: "Test Kitchen",
      });
      await vi.waitFor(() => {
        expect(revalidatePath).toHaveBeenCalledWith("/dashboard/onboarding");
      });
    });

    it("afterHoursSettingsMutation calls sync with hours trigger", async () => {
      syncRestaurantAgentAfterContentChange.mockResolvedValue(
        mockSyncResult({ ok: true, trigger: "hours" })
      );
      const { afterHoursSettingsMutation } = await import(
        "@/lib/voice-agent/after-restaurant-settings-mutation"
      );

      afterHoursSettingsMutation(RESTAURANT_ID, {
        userId: USER_ID,
        restaurantName: "Test Kitchen",
      });

      expect(syncRestaurantAgentAfterContentChange).toHaveBeenCalledWith({
        restaurantId: RESTAURANT_ID,
        trigger: "hours",
        userId: USER_ID,
        restaurantName: "Test Kitchen",
      });
    });

    it("afterMenuContentMutation does not throw when sync rejects", async () => {
      syncRestaurantAgentAfterContentChange.mockRejectedValue(
        new Error("network fail")
      );
      const { afterMenuContentMutation } = await import(
        "@/lib/voice-agent/after-menu-content-mutation"
      );

      expect(() =>
        afterMenuContentMutation(RESTAURANT_ID, { userId: USER_ID })
      ).not.toThrow();

      await vi.waitFor(() => {
        expect(revalidatePath.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("failed sync is displayable from profile fields", () => {
    it("maps persisted profile columns to UI error state", async () => {
      const { menuAutoSyncFromProfile, resolveMenuAutoSyncDisplay } = await import(
        "@/lib/voice-agent/menu-auto-sync-display"
      );

      const snapshot = menuAutoSyncFromProfile({
        elevenlabs_agent_id: MOCK_AGENT_ID,
        elevenlabs_menu_auto_sync_status: "failed",
        elevenlabs_menu_auto_sync_error: "ElevenLabs rate limited",
        elevenlabs_last_sync_at: "2026-05-30T10:00:00.000Z",
      });

      const display = resolveMenuAutoSyncDisplay(snapshot);
      expect(display.phase).toBe("failed");
      expect(display.errorMessage).toBe("ElevenLabs rate limited");
      expect(display.badgeLabel).toBe("Sync error");
    });
  });
});

describe("menu/profile/hours server actions schedule auto-sync", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("saveCategoryAction returns success and schedules menu sync when DB write succeeds", async () => {
    vi.doMock("@/lib/auth/context-server", () => ({
      requireRestaurantAccess: vi.fn().mockResolvedValue(accessOk()),
    }));
    vi.doMock("@/lib/menu-editor/duplicates.server", () => ({
      assertCategoryNameAvailable: vi.fn().mockResolvedValue(undefined),
      assertItemNameAvailable: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("@/lib/menu-editor/scope", () => ({
      assertCategoryInRestaurant: vi.fn().mockResolvedValue(undefined),
      assertItemInRestaurant: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("@/lib/voice-agent/after-menu-content-mutation", () => ({
      afterMenuContentMutation: afterMenuContentMutationSpy,
    }));

    const savedCategory = {
      id: CATEGORY_ID,
      restaurant_id: RESTAURANT_ID,
      name: "Appetizers",
      sort_order: 1,
      created_at: "2026-05-30T12:00:00.000Z",
      updated_at: "2026-05-30T12:00:00.000Z",
    };

    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabase: vi.fn().mockResolvedValue({
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: savedCategory,
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      }),
    }));

    const { saveCategoryAction } = await import(
      "@/app/dashboard/restaurants/[id]/menu/menu-actions"
    );

    const result = await saveCategoryAction(RESTAURANT_ID, {
      id: CATEGORY_ID,
      name: "Appetizers",
      sort_order: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.category).toEqual(savedCategory);
    expect(afterMenuContentMutationSpy).toHaveBeenCalledWith(RESTAURANT_ID, {
      userId: USER_ID,
    });
  });

  it("saveCategoryAction still succeeds when background sync fails", async () => {
    syncRestaurantAgentAfterContentChange.mockResolvedValue(
      mockSyncResult({ ok: false, error: "Sync failed after save" })
    );

    vi.doMock("@/lib/voice-agent/after-menu-content-mutation", async () =>
      vi.importActual("@/lib/voice-agent/after-menu-content-mutation")
    );
    vi.doMock("@/lib/auth/context-server", () => ({
      requireRestaurantAccess: vi.fn().mockResolvedValue(accessOk()),
    }));
    vi.doMock("@/lib/menu-editor/duplicates.server", () => ({
      assertCategoryNameAvailable: vi.fn().mockResolvedValue(undefined),
      assertItemNameAvailable: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("@/lib/menu-editor/scope", () => ({
      assertCategoryInRestaurant: vi.fn().mockResolvedValue(undefined),
      assertItemInRestaurant: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));

    const savedCategory = {
      id: CATEGORY_ID,
      restaurant_id: RESTAURANT_ID,
      name: "Mains",
      sort_order: 2,
      created_at: "2026-05-30T12:00:00.000Z",
      updated_at: "2026-05-30T12:00:00.000Z",
    };

    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabase: vi.fn().mockResolvedValue({
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: savedCategory,
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      }),
    }));

    const { saveCategoryAction } = await import(
      "@/app/dashboard/restaurants/[id]/menu/menu-actions"
    );

    const result = await saveCategoryAction(RESTAURANT_ID, {
      id: CATEGORY_ID,
      name: "Mains",
      sort_order: 2,
    });

    expect(result.ok).toBe(true);
    expect(result.category.name).toBe("Mains");

    await vi.waitFor(() =>
      expect(syncRestaurantAgentAfterContentChange).toHaveBeenCalledWith(
        expect.objectContaining({ trigger: "menu", restaurantId: RESTAURANT_ID })
      )
    );
  });

  it("saveRestaurantProfileSettingsAction schedules profile sync after upsert", async () => {
    vi.doMock("@/lib/auth/context-server", () => ({
      requireRestaurantAccess: vi.fn().mockResolvedValue(accessOk()),
    }));
    vi.doMock("@/lib/restaurant-profile/helpers", () => ({
      upsertRestaurantProfile: vi.fn().mockResolvedValue({
        restaurant_id: RESTAURANT_ID,
        name: "Test Kitchen",
      }),
    }));
    vi.doMock("@/lib/onboarding/helpers", () => ({
      updateRestaurantOnboardingStep: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabase: vi.fn().mockResolvedValue({}),
    }));
    vi.doMock("@/lib/voice-agent/after-restaurant-settings-mutation", () => ({
      afterProfileSettingsMutation: afterProfileSettingsMutationSpy,
      afterHoursSettingsMutation: vi.fn(),
    }));

    const { saveRestaurantProfileSettingsAction } = await import(
      "@/app/dashboard/restaurants/[id]/profile-actions"
    );

    const result = await saveRestaurantProfileSettingsAction(RESTAURANT_ID, {
      name: "Test Kitchen",
      phone: null,
      address_line1: null,
      address_line2: null,
      city: null,
      region: null,
      postal_code: null,
      country: "US",
      timezone: "America/Chicago",
      cuisine: null,
      website: null,
      allows_pickup: true,
      allows_delivery: false,
      prep_time_minutes: 20,
      tax_rate_percent: 0,
      service_fee_percent: 0,
      escalation_name: null,
      escalation_phone: null,
      escalation_email: null,
    });

    expect(result.ok).toBe(true);
    expect(afterProfileSettingsMutationSpy).toHaveBeenCalledWith(RESTAURANT_ID, {
      userId: USER_ID,
      restaurantName: "Test Kitchen",
    });
  });

  it("saveRestaurantHoursAction schedules hours sync after DB writes", async () => {
    vi.doMock("@/lib/auth/context-server", () => ({
      requireRestaurantAccess: vi.fn().mockResolvedValue(accessOk()),
    }));
    vi.doMock("@/lib/voice-agent/after-restaurant-settings-mutation", () => ({
      afterProfileSettingsMutation: vi.fn(),
      afterHoursSettingsMutation: afterHoursSettingsMutationSpy,
    }));

    const upsert = vi.fn().mockResolvedValue({ error: null });

    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabase: vi.fn().mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "restaurant_profiles") {
            return {
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            };
          }
          if (table === "restaurant_weekly_hours") {
            return { upsert };
          }
          if (table === "restaurant_hours_exceptions") {
            return {
              upsert,
              select: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
              delete: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            };
          }
          throw new Error(table);
        }),
      }),
    }));

    const { saveRestaurantHoursAction } = await import(
      "@/app/dashboard/restaurants/[id]/hours-actions"
    );

    const weekly = Array.from({ length: 7 }, (_, day_of_week) => ({
      day_of_week,
      is_closed: day_of_week === 0,
      open_time: day_of_week === 0 ? null : "11:00",
      close_time: day_of_week === 0 ? null : "21:00",
    }));

    const result = await saveRestaurantHoursAction(RESTAURANT_ID, {
      temporarily_closed: false,
      temporarily_closed_reason: null,
      weekly,
      exceptions: [],
    });

    expect(result.ok).toBe(true);
    expect(afterHoursSettingsMutationSpy).toHaveBeenCalledWith(RESTAURANT_ID, {
      userId: USER_ID,
      restaurantName: "Test Kitchen",
    });
  });
});
