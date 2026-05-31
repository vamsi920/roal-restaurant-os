import { revalidatePath } from "next/cache";
import { markRestaurantMenuTemplateLocalOverride } from "@/lib/menu-editor/copy-menu";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  syncRestaurantAgentAfterContentChange,
  VOICE_AGENT_CONTENT_SYNC_TRIGGERS,
  type VoiceAgentContentSyncTrigger,
} from "@/lib/voice-agent/sync-restaurant-agent-after-content-change";

export function menuContentRevalidatePaths(
  restaurantId: string
): readonly string[] {
  return [
    `/dashboard/restaurants/${restaurantId}`,
    `/dashboard/restaurants/${restaurantId}/menu`,
    `/dashboard/restaurants/${restaurantId}/agent`,
  ] as const;
}

export function revalidateMenuContentSurfaces(restaurantId: string): void {
  for (const path of menuContentRevalidatePaths(restaurantId)) {
    revalidatePath(path);
  }
}

export type AfterMenuContentMutationOptions = {
  userId?: string | null;
  restaurantName?: string;
  trackTemplateOverride?: boolean;
  /** Defaults to menu editor saves; scanner commit passes `scanner_commit`. */
  trigger?: VoiceAgentContentSyncTrigger | string;
};

/** Revalidate menu surfaces immediately; sync agent in background; revalidate again after profile updates. */
export function afterMenuContentMutation(
  restaurantId: string,
  options?: AfterMenuContentMutationOptions
): void {
  revalidateMenuContentSurfaces(restaurantId);
  if (options?.trackTemplateOverride !== false) {
    void createServerSupabase()
      .then((supabase) =>
        markRestaurantMenuTemplateLocalOverride(supabase, restaurantId)
      )
      .catch(() => undefined);
  }
  void syncRestaurantAgentAfterContentChange({
    restaurantId,
    trigger: options?.trigger ?? VOICE_AGENT_CONTENT_SYNC_TRIGGERS.menu,
    userId: options?.userId ?? null,
    restaurantName: options?.restaurantName,
  })
    .catch(() => undefined)
    .finally(() => {
      revalidateMenuContentSurfaces(restaurantId);
    });
}
