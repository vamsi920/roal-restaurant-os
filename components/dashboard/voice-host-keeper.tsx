"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Invisible: when an owner opens a location, ask the server to make sure its phone host is
 * created and synced. When that changes something, refresh so status cards update.
 */
export function VoiceHostKeeper({ restaurantId }: { restaurantId: string | null }) {
  const router = useRouter();
  const checked = useRef(new Set<string>());

  useEffect(() => {
    if (!restaurantId || checked.current.has(restaurantId)) return;
    checked.current.add(restaurantId);
    let cancelled = false;
    void fetch(`/api/restaurants/${restaurantId}/voice-host`, { method: "POST", credentials: "same-origin" })
      .then((r) => r.json().catch(() => null))
      .then((body: { state?: string; started?: boolean } | null) => {
        if (!cancelled && body?.started) router.refresh();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [restaurantId, router]);

  return null;
}
