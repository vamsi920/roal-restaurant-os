import { revalidatePath } from "next/cache";
import {
  syncRestaurantAgentAfterContentChange,
  VOICE_AGENT_CONTENT_SYNC_TRIGGERS,
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
};

/** Revalidate menu surfaces immediately; sync agent in background; revalidate again after profile updates. */
export function afterMenuContentMutation(
  restaurantId: string,
  options?: AfterMenuContentMutationOptions
): void {
  revalidateMenuContentSurfaces(restaurantId);
  void syncRestaurantAgentAfterContentChange({
    restaurantId,
    trigger: VOICE_AGENT_CONTENT_SYNC_TRIGGERS.menu,
    userId: options?.userId ?? null,
    restaurantName: options?.restaurantName,
  })
    .catch(() => undefined)
    .finally(() => {
      revalidateMenuContentSurfaces(restaurantId);
    });
}
