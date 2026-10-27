"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_POLL_TIMING,
  connectionStateAfter,
  nextPollDelay,
  type LiveConnectionState,
  type PollTiming,
} from "@/lib/live/poll-schedule";

export type { LiveConnectionState } from "@/lib/live/poll-schedule";

export type UsePollOptions<T> = {
  /** Called with each successful payload (keep it stable or it is read via ref anyway). */
  onData: (data: T) => void;
  /** Called after a failed fetch (aborts are not failures). */
  onError?: (error: Error, consecutiveFailures: number) => void;
  /** Called once when the connection transitions into "degraded". */
  onDegraded?: () => void;
  /** Pause polling entirely (e.g. no restaurant yet). Default true. */
  enabled?: boolean;
  /** Fetch immediately on mount. Default true. */
  immediate?: boolean;
  timing?: Partial<PollTiming>;
};

export type UsePollResult = {
  state: LiveConnectionState;
  lastUpdatedAt: number | null;
  lastError: string | null;
  /** Fetch now (cancels any in-flight request). Resolves when the fetch settles. */
  refresh: () => Promise<void>;
};

/**
 * Poll a server endpoint while the page is open — the replacement for Supabase
 * realtime channels. 3s while the tab is visible, 15s while hidden, refetch
 * immediately on focus / visibility, abort in-flight requests on unmount or when
 * a newer fetch starts, and expose a connection state for the Live badges.
 */
export function usePoll<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: UsePollOptions<T>
): UsePollResult {
  const { enabled = true, immediate = true } = options;
  const timing: PollTiming = { ...DEFAULT_POLL_TIMING, ...options.timing };
  const timingKey = `${timing.intervalMs}:${timing.hiddenIntervalMs}:${timing.maxBackoffMs}:${timing.degradeAfterFailures}`;

  const [state, setState] = useState<LiveConnectionState>("connecting");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  const optionsRef = useRef(options);
  fetcherRef.current = fetcher;
  optionsRef.current = options;

  const stateRef = useRef<LiveConnectionState>("connecting");
  const failuresRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const runRef = useRef<() => Promise<void>>(async () => {});

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!enabled) return;
    mountedRef.current = true;
    const t: PollTiming = { ...DEFAULT_POLL_TIMING, ...optionsRef.current.timing };

    const isVisible = () =>
      typeof document === "undefined" || document.visibilityState !== "hidden";

    const schedule = () => {
      clearTimer();
      if (!mountedRef.current) return;
      const delay = nextPollDelay(
        { visible: isVisible(), consecutiveFailures: failuresRef.current },
        t
      );
      timerRef.current = setTimeout(() => void run(), delay);
    };

    const setConn = (next: LiveConnectionState) => {
      const prev = stateRef.current;
      stateRef.current = next;
      setState(next);
      if (next === "degraded" && prev !== "degraded") optionsRef.current.onDegraded?.();
    };

    async function run(): Promise<void> {
      clearTimer();
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        const data = await fetcherRef.current(controller.signal);
        if (controller.signal.aborted || !mountedRef.current) return;
        failuresRef.current = 0;
        optionsRef.current.onData(data);
        setLastUpdatedAt(Date.now());
        setLastError(null);
        setConn(connectionStateAfter(stateRef.current, "ok", 0, t));
      } catch (e) {
        if (controller.signal.aborted || !mountedRef.current) return;
        failuresRef.current += 1;
        const err = e instanceof Error ? e : new Error(String(e));
        setLastError(err.message);
        optionsRef.current.onError?.(err, failuresRef.current);
        setConn(connectionStateAfter(stateRef.current, "error", failuresRef.current, t));
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          if (mountedRef.current) schedule();
        }
      }
    }
    runRef.current = run;

    const onVisibility = () => {
      if (isVisible()) void run();
      else schedule(); // re-arm at the slower hidden cadence
    };
    const onFocus = () => void run();
    const onOnline = () => void run();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    if (immediate) void run();
    else schedule();

    return () => {
      mountedRef.current = false;
      clearTimer();
      controllerRef.current?.abort();
      controllerRef.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled, immediate, timingKey]);

  const refresh = useCallback(() => runRef.current(), []);

  return { state, lastUpdatedAt, lastError, refresh };
}

/** GET a same-origin JSON endpoint for polling (no cache, credentials included). */
export async function fetchLiveJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || body === null) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}
