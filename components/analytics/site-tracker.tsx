"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { isPixelPath } from "@/lib/meta-pixel";

/** Set on this browser by the admin stats page so the owner's own visits are not counted. */
export const NO_TRACK_KEY = "roal_no_track";

function optedOut(): boolean {
  try {
    return window.localStorage.getItem(NO_TRACK_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Sends one tiny beacon per public page view to /api/collect.
 * No cookies, no identifiers; the server keeps daily totals only.
 */
export function SiteTracker() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!pathname || !isPixelPath(pathname) || optedOut()) return;
    const params = new URLSearchParams(window.location.search);
    const payload = JSON.stringify({
      p: pathname,
      // Only the landing page has an outside referrer; later moves are internal.
      r: first.current ? document.referrer || null : window.location.origin,
      us: first.current ? params.get("utm_source") : null,
      uc: first.current ? params.get("utm_campaign") : null,
    });
    first.current = false;
    try {
      const blob = new Blob([payload], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/collect", blob)) {
        void fetch("/api/collect", { method: "POST", body: payload, keepalive: true, headers: { "content-type": "application/json" } });
      }
    } catch {
      // ignore
    }
  }, [pathname]);

  return null;
}
