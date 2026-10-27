/**
 * Pure scheduling rules for live polling (no React, unit-testable).
 *
 * - Visible tab: poll every `intervalMs` (default 3s).
 * - Hidden tab: back off to `hiddenIntervalMs` (default 15s).
 * - Consecutive failures: exponential backoff from the base interval, capped at
 *   `maxBackoffMs`, so a dead server is not hammered.
 */

export type LiveConnectionState = "connecting" | "live" | "degraded";

export type PollTiming = {
  intervalMs: number;
  hiddenIntervalMs: number;
  maxBackoffMs: number;
  /** Failures in a row before the badge flips to "degraded". */
  degradeAfterFailures: number;
};

export const DEFAULT_POLL_TIMING: PollTiming = {
  intervalMs: 3_000,
  hiddenIntervalMs: 15_000,
  maxBackoffMs: 30_000,
  degradeAfterFailures: 2,
};

export function nextPollDelay(
  input: { visible: boolean; consecutiveFailures: number },
  timing: PollTiming = DEFAULT_POLL_TIMING
): number {
  const base = input.visible ? timing.intervalMs : timing.hiddenIntervalMs;
  if (input.consecutiveFailures <= 0) return base;
  const backoff = timing.intervalMs * 2 ** Math.min(input.consecutiveFailures, 10);
  return Math.min(timing.maxBackoffMs, Math.max(base, backoff));
}

export function connectionStateAfter(
  prev: LiveConnectionState,
  outcome: "ok" | "error",
  consecutiveFailures: number,
  timing: PollTiming = DEFAULT_POLL_TIMING
): LiveConnectionState {
  if (outcome === "ok") return "live";
  if (consecutiveFailures >= timing.degradeAfterFailures) return "degraded";
  // First failure: keep the current badge (a single blip should not flash "Reconnecting").
  return prev;
}
