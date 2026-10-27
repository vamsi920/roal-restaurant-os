"use client";

import { useCallback, useEffect, useState } from "react";

/** Seconds-left countdown so "Resend" can't hammer the reset-email rate limit. */
export function useResendCooldown(seconds = 30) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);

  const start = useCallback(() => setLeft(seconds), [seconds]);
  return { left, start, ready: left <= 0 };
}
