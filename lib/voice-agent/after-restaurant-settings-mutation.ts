import { revalidatePath } from "next/cache";
import {
  syncRestaurantAgentAfterContentChange,
  VOICE_AGENT_CONTENT_SYNC_TRIGGERS,
  type VoiceAgentContentSyncTrigger,
} from "@/lib/voice-agent/sync-restaurant-agent-after-content-change";

export function restaurantSettingsRevalidatePaths(
  restaurantId: string
): readonly string[] {
  return [
    `/dashboard/restaurants/${restaurantId}`,
    `/dashboard/restaurants/${restaurantId}/menu`,
    `/dashboard/restaurants/${restaurantId}/agent`,
  ] as const;
}

export function revalidateRestaurantSettingsSurfaces(restaurantId: string): void {
  for (const path of restaurantSettingsRevalidatePaths(restaurantId)) {
    revalidatePath(path);
  }
}

export type AfterRestaurantSettingsMutationOptions = {
  userId?: string | null;
  restaurantName?: string;
};

function afterRestaurantSettingsMutation(
  restaurantId: string,
  trigger: VoiceAgentContentSyncTrigger,
  options?: AfterRestaurantSettingsMutationOptions,
  extraRevalidate?: () => void
): void {
  const revalidateAll = () => {
    revalidateRestaurantSettingsSurfaces(restaurantId);
    extraRevalidate?.();
  };

  revalidateAll();
  void syncRestaurantAgentAfterContentChange({
    restaurantId,
    trigger,
    userId: options?.userId ?? null,
    restaurantName: options?.restaurantName,
  })
    .catch(() => undefined)
    .finally(revalidateAll);
}

/** Profile save → agent prompt with fulfillment, prep, taxes, escalation (hours loaded on sync). */
export function afterProfileSettingsMutation(
  restaurantId: string,
  options?: AfterRestaurantSettingsMutationOptions
): void {
  afterRestaurantSettingsMutation(
    restaurantId,
    VOICE_AGENT_CONTENT_SYNC_TRIGGERS.profile,
    options,
    () => revalidatePath("/dashboard/onboarding")
  );
}

/** Knowledge/FAQ save → dedicated agent prompt + knowledge doc refresh. */
export function afterRestaurantKnowledgeMutation(
  restaurantId: string,
  options?: AfterRestaurantSettingsMutationOptions
): void {
  afterRestaurantSettingsMutation(
    restaurantId,
    VOICE_AGENT_CONTENT_SYNC_TRIGGERS.knowledge,
    options,
    () => revalidatePath("/dashboard/onboarding")
  );
}

/** Hours save → agent prompt with weekly hours, exceptions, and ordering gates. */
export function afterHoursSettingsMutation(
  restaurantId: string,
  options?: AfterRestaurantSettingsMutationOptions
): void {
  afterRestaurantSettingsMutation(
    restaurantId,
    VOICE_AGENT_CONTENT_SYNC_TRIGGERS.hours,
    options
  );
}

/** Upsell rules save → dedicated agent prompt refresh with menu-bound offers. */
export function afterRestaurantUpsellMutation(
  restaurantId: string,
  options?: AfterRestaurantSettingsMutationOptions
): void {
  afterRestaurantSettingsMutation(
    restaurantId,
    VOICE_AGENT_CONTENT_SYNC_TRIGGERS.upsell,
    options,
    () => revalidatePath("/dashboard/onboarding")
  );
}
