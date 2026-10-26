"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { StatTile, StatusChip, type Tone } from "@/components/dashboard/page-primitives";
import { VoiceProvisionStatusBadge } from "@/components/dashboard/voice-provision-status-badge";
import { formatSupabaseClientError } from "@/lib/dashboard/format-user-error";
import { loadRestaurantCardStats } from "@/lib/restaurant-list/card-stats";
import { buildPortfolioSummary } from "@/lib/restaurant-list/portfolio-summary";
import type {
  PortfolioSummary,
  RestaurantCardStats,
  RestaurantListProfile,
} from "@/lib/restaurant-list/types";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import type { Restaurant } from "@/lib/types";
import type { MenuAutoSyncUiPhase } from "@/lib/voice-agent/menu-auto-sync-display";
import {
  restaurantLiveOrdersHref,
  restaurantMenuSetupHref,
  restaurantVoiceAgentHref,
  voiceProvisionUiStateFromProfile,
} from "@/lib/voice-agent/provision-display";
import { CreateRestaurantButton } from "./CreateRestaurantButton";

const REALTIME_RELOAD_MS = 450;

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [profilesByRestaurantId, setProfilesByRestaurantId] = useState<
    Record<string, RestaurantListProfile>
  >({});
  const [statsByRestaurantId, setStatsByRestaurantId] = useState<
    Record<string, RestaurantCardStats>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashedIds, setFlashedIds] = useState<Set<string>>(new Set());
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((id: string) => {
    setFlashedIds((prev) => new Set(prev).add(id));
    const existing = flashTimers.current.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setFlashedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      flashTimers.current.delete(id);
    }, 1800);
    flashTimers.current.set(id, timer);
  }, []);

  const loadRestaurants = useCallback(async () => {
    setError(null);
    const supabase = getBrowserSupabase();
    const { data, error: loadError } = await supabase
      .from("restaurants")
      .select("*")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(formatSupabaseClientError(loadError.message));
      return;
    }

    const rows = (data ?? []) as Restaurant[];
    setRestaurants(rows);

    if (rows.length === 0) {
      setProfilesByRestaurantId({});
      setStatsByRestaurantId({});
      return;
    }

    const ids = rows.map((r) => r.id);

    const { data: profiles, error: profileError } = await supabase
      .from("restaurant_profiles")
      .select(
        "restaurant_id, phone, timezone, address_line1, allows_pickup, allows_delivery, elevenlabs_provision_status, elevenlabs_provision_error, elevenlabs_agent_id, elevenlabs_last_sync_error, elevenlabs_menu_auto_sync_status, elevenlabs_menu_auto_sync_error, elevenlabs_last_sync_at, elevenlabs_last_sync_summary"
      )
      .in("restaurant_id", ids);

    if (profileError) {
      console.error("restaurant_profiles load", profileError.message);
      return;
    }

    const map: Record<string, RestaurantListProfile> = {};
    for (const row of profiles ?? []) {
      map[row.restaurant_id as string] = row as RestaurantListProfile;
    }
    setProfilesByRestaurantId(map);

    try {
      const namesById = Object.fromEntries(rows.map((r) => [r.id, r.name]));
      const stats = await loadRestaurantCardStats(supabase, ids, map, namesById);
      setStatsByRestaurantId(stats);
    } catch (statsErr) {
      console.error(
        "restaurant card stats",
        statsErr instanceof Error ? statsErr.message : statsErr
      );
      setStatsByRestaurantId({});
    }
  }, []);

  const scheduleReload = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      void loadRestaurants();
    }, REALTIME_RELOAD_MS);
  }, [loadRestaurants]);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    void loadRestaurants().finally(() => setLoading(false));

    const restaurantsChannel = supabase
      .channel("restaurants-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurants" },
        (payload: RealtimePostgresChangesPayload<Restaurant>) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Restaurant;
            setRestaurants((prev) => {
              if (prev.some((r) => r.id === row.id)) return prev;
              return [row, ...prev].sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              );
            });
            flash(row.id);
            scheduleReload();
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Restaurant;
            setRestaurants((prev) =>
              prev.map((r) => (r.id === row.id ? row : r))
            );
            flash(row.id);
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as Restaurant;
            setRestaurants((prev) => prev.filter((r) => r.id !== row.id));
            scheduleReload();
          }
        }
      )
      .subscribe();

    const opsChannel = supabase
      .channel("restaurant-ops-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_profiles" },
        () => scheduleReload()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draft_orders" },
        () => scheduleReload()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "phone_order_receipts" },
        () => scheduleReload()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_call_events" },
        () => scheduleReload()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_reservation_requests" },
        () => scheduleReload()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => scheduleReload()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        () => scheduleReload()
      )
      .subscribe();

    const flashMap = flashTimers.current;
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      flashMap.forEach((timer) => clearTimeout(timer));
      flashMap.clear();
      supabase.removeChannel(restaurantsChannel);
      supabase.removeChannel(opsChannel);
    };
  }, [flash, loadRestaurants, scheduleReload]);

  const portfolio = useMemo(
    () => buildPortfolioSummary(statsByRestaurantId),
    [statsByRestaurantId]
  );

  return (
    <div className="locations-page dashboard-page dashboard-page--wide min-w-0 space-y-5 overflow-x-clip">
      {loading ? (
        <LoadingState aria-busy="true" />
      ) : error ? (
        <ErrorState error={error} onRetry={loadRestaurants} />
      ) : restaurants.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <PortfolioSummaryStrip summary={portfolio} />
          <ul className="locations-page__grid grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {restaurants.map((r, idx) => (
              <li key={r.id} className="min-w-0">
                <RestaurantCard
                  restaurant={r}
                  profile={profilesByRestaurantId[r.id] ?? null}
                  stats={statsByRestaurantId[r.id] ?? null}
                  index={idx}
                  flashed={flashedIds.has(r.id)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function PortfolioSummaryStrip({ summary }: { summary: PortfolioSummary }) {
  return (
    <section
      className="locations-portfolio min-w-0"
      aria-labelledby="locations-portfolio-heading"
    >
      <h2 id="locations-portfolio-heading" className="sr-only">
        Organization portfolio
      </h2>
      <dl className="locations-portfolio__grid grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3">
        <StatTile label="Locations" value={summary.totalLocations} />
        <StatTile
          label="Ready for calls"
          value={summary.locationsReadyForCalls}
          tone={
            summary.totalLocations > 0 &&
            summary.locationsReadyForCalls === summary.totalLocations
              ? "ok"
              : "neutral"
          }
        />
        <StatTile label="Active calls" value={summary.activeCallsNow} />
        <StatTile label="Orders (24h)" value={summary.successfulOrdersInPeriod} />
        <StatTile label="Follow-ups" value={summary.openFollowUps} />
        <StatTile
          label="Needs attention"
          value={summary.locationsNeedingAttention}
          tone={summary.locationsNeedingAttention > 0 ? "warn" : "neutral"}
        />
      </dl>
    </section>
  );
}

function RestaurantCard({
  restaurant,
  profile,
  stats,
  index,
  flashed,
}: {
  restaurant: Restaurant;
  profile: RestaurantListProfile | null;
  stats: RestaurantCardStats | null;
  index: number;
  flashed: boolean;
}) {
  const provisionState = voiceProvisionUiStateFromProfile(profile);
  const ordersHref = restaurantLiveOrdersHref(restaurant.id);
  const menuHref = restaurantMenuSetupHref(restaurant.id);
  const agentHref = restaurantVoiceAgentHref(restaurant.id);
  const nextAction = stats?.nextBestAction ?? {
    label: "Open orders",
    href: ordersHref,
  };
  const place = profile?.address_line1?.trim() || null;
  const isReady = stats?.readyForCalls ?? provisionState === "ready";

  return (
    <article
      className={cn(
        "locations-card card dashboard-stagger flex h-full min-w-0 flex-col p-4",
        flashed && "flash-row"
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="locations-card__title min-w-0">
            <Link
              href={ordersHref}
              className="locations-card__title-link block truncate text-[15px] font-semibold tracking-tight text-ink hover:underline"
              title={restaurant.name}
              aria-label={`Open ${restaurant.name}`}
            >
              {restaurant.name}
            </Link>
          </h2>
          <p className="mt-0.5 truncate text-[12px] text-subtle">
            {place ?? `Added ${formatDate(restaurant.created_at)}`}
          </p>
        </div>
        {stats && stats.activeCallCount > 0 ? (
          <span className="chip chip--accent shrink-0" title="Calls in progress">
            <span className="pulse-dot pulse-dot--accent" aria-hidden />
            {stats.activeCallCount} on call
          </span>
        ) : null}
      </div>

      <div className="locations-card__meta mt-3">
        {provisionState === "not_started" ? (
          <StatusChip tone="neutral">Host not set up</StatusChip>
        ) : (
          <VoiceProvisionStatusBadge state={provisionState} profile={profile} compact />
        )}
        {stats ? (
          <StatusChip tone={menuSyncTone(stats.menuSyncPhase)}>
            Menu {menuSyncLabel(stats.menuSyncPhase)}
          </StatusChip>
        ) : null}
      </div>

      <dl className="locations-card__stats mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatItem
          label="Orders (24h)"
          value={stats ? String(stats.successfulOrdersInPeriod) : "—"}
        />
        <StatItem
          label="Follow-ups"
          value={stats ? String(stats.openFollowUpCount) : "—"}
        />
        <StatItem
          label="Reservations"
          value={stats ? String(stats.openReservationCount) : "—"}
        />
        <StatItem label="Menu items" value={stats ? String(stats.menuItemCount) : "—"} />
        <StatItem label="Last order" value={formatLastOrderAt(stats?.lastOrderAt ?? null)} />
        <StatItem label="Calls now" value={stats ? String(stats.activeCallCount) : "—"} />
      </dl>

      {stats?.syncError ? (
        <p
          className="locations-card__sync-error mt-3 rounded-md border border-danger/25 bg-danger/5 px-2.5 py-1.5 text-[12px] text-danger [overflow-wrap:anywhere]"
          role="alert"
        >
          {stats.syncError}
        </p>
      ) : null}

      <div className="locations-card__actions mt-4 flex flex-col gap-2 border-t border-line pt-3">
        <Link
          href={nextAction.href}
          className={cn(
            "inline-flex items-center justify-center px-3 text-center",
            isReady ? "btn-ghost" : "btn-primary"
          )}
        >
          {nextAction.label}
        </Link>
        <div className="grid grid-cols-3 gap-1.5">
          <FastPathLink href={ordersHref}>Orders</FastPathLink>
          <FastPathLink href={menuHref}>Menu</FastPathLink>
          <FastPathLink href={agentHref}>Agent</FastPathLink>
        </div>
      </div>
    </article>
  );
}

function menuSyncLabel(phase: MenuAutoSyncUiPhase): string {
  switch (phase) {
    case "syncing":
      return "syncing";
    case "failed":
      return "sync error";
    case "succeeded":
      return "synced";
    case "idle":
      return "not synced";
    default:
      return "no host";
  }
}

function menuSyncTone(phase: MenuAutoSyncUiPhase): Tone {
  switch (phase) {
    case "syncing":
      return "warn";
    case "failed":
      return "bad";
    case "succeeded":
      return "ok";
    default:
      return "neutral";
  }
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="locations-card__stat min-w-0">
      <dt className="truncate text-[11px] font-semibold uppercase tracking-wider text-subtle">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium tabular-nums text-ink">
        {value}
      </dd>
    </div>
  );
}

function FastPathLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-md px-2 text-center text-[12px] font-medium text-muted hover:bg-elev hover:text-ink lg:min-h-8"
    >
      {children}
    </Link>
  );
}

function LoadingState({ "aria-busy": ariaBusy }: { "aria-busy"?: "true" }) {
  return (
    <>
      <div className="locations-portfolio-skeleton grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
      <div
        className="locations-page__grid grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        role="status"
        aria-live="polite"
        aria-busy={ariaBusy}
        aria-label="Loading restaurants"
      >
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="locations-card-skeleton card flex min-w-0 flex-col p-4">
            <div className="space-y-2">
              <div className="skeleton h-4 w-2/3 max-w-full" />
              <div className="skeleton h-3 w-1/3 max-w-full" />
            </div>
            <div className="mt-3 flex gap-2">
              <div className="skeleton h-5 w-20 rounded-full" />
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((__, statIdx) => (
                <div key={statIdx} className="skeleton h-9 rounded-md" />
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-line pt-3">
              <div className="skeleton h-9 rounded-lg" />
              <div className="grid grid-cols-3 gap-1.5">
                <div className="skeleton h-8 rounded-md" />
                <div className="skeleton h-8 rounded-md" />
                <div className="skeleton h-8 rounded-md" />
              </div>
            </div>
          </div>
        ))}
        <span className="sr-only">Loading restaurants…</span>
      </div>
    </>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => Promise<void>;
}) {
  const [retrying, setRetrying] = useState(false);

  return (
    <div className="locations-page__state locations-page__state--error card min-w-0 p-5 sm:p-6">
      <h3 className="text-[15px] font-semibold text-ink">Could not load locations</h3>
      <p className="locations-page__error-text mt-1 text-[13px] text-danger" role="alert">
        {error}
      </p>
      <button
        type="button"
        className="btn-primary locations-page__retry mt-4"
        disabled={retrying}
        aria-busy={retrying}
        onClick={() => {
          setRetrying(true);
          void onRetry().finally(() => setRetrying(false));
        }}
      >
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="locations-page__state locations-page__state--empty card card--raised mx-auto max-w-xl min-w-0 p-6 text-center sm:p-10">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-ink text-base">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.8 2.1Z" />
        </svg>
      </div>
      <h3 className="mt-4 font-display text-[20px] font-semibold tracking-tight text-ink">
        Set up your first location
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-pretty text-[13px] leading-relaxed text-muted">
        Paste your menu link. ROAL builds a phone host that answers calls, takes pickup
        orders, and sends tickets to the kitchen. About two minutes.
      </p>
      <div className="mt-5 flex justify-center">
        <CreateRestaurantButton
          label="Set up a location"
          className="btn-lg"
          href="/dashboard/onboarding"
        />
      </div>
      <p className="mt-3 text-[12px] text-subtle">$0.90 per completed order. No monthly fee.</p>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLastOrderAt(iso: string | null): string {
  if (!iso) return "None yet";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "None yet";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 48) return `${diffHours}h ago`;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
