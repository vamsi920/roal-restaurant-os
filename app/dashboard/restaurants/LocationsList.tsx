"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ChefHat,
  Headphones,
  MapPin,
  MessageSquareText,
  PhoneCall,
  Radio,
  ShoppingBag,
  Store,
} from "lucide-react";
import "@/components/dashboard/org-pages.css";
import {
  Badge,
  EmptyState as UiEmptyState,
  IconTile,
  PageHeader,
  StatCard,
  type Tone,
} from "@/components/ui";
import { formatSupabaseClientError } from "@/lib/dashboard/format-user-error";
import { buildPortfolioSummary } from "@/lib/restaurant-list/portfolio-summary";
import type {
  PortfolioSummary,
  RestaurantCardStats,
  RestaurantListProfile,
} from "@/lib/restaurant-list/types";
import { fetchLiveJson, usePoll } from "@/lib/live/use-poll";
import { liveEndpoints } from "@/lib/live/endpoints";
import type { LocationsPayload } from "@/lib/restaurant-list/load-locations";
import { cn } from "@/lib/cn";
import type { Restaurant } from "@/lib/types";
import type { MenuAutoSyncUiPhase } from "@/lib/voice-agent/menu-auto-sync-display";
import {
  restaurantLiveOrdersHref,
  restaurantMenuSetupHref,
  restaurantVoiceAgentHref,
  voiceProvisionBadgeTitle,
  voiceProvisionUiStateFromProfile,
  type VoiceProvisionUiState,
} from "@/lib/voice-agent/provision-display";
import { ADD_LOCATION_HREF, CreateRestaurantButton } from "./CreateRestaurantButton";

type Props = {
  initial: LocationsPayload;
};

/**
 * "All locations" grid. First paint comes from the server component (scoped to the
 * caller's org memberships); afterwards it polls GET /api/restaurants/locations so
 * status, calls and orders stay current without Supabase realtime.
 */
export function LocationsList({ initial }: Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initial.restaurants);
  const [profilesByRestaurantId, setProfilesByRestaurantId] = useState<
    Record<string, RestaurantListProfile>
  >(initial.profilesByRestaurantId);
  const [statsByRestaurantId, setStatsByRestaurantId] = useState<
    Record<string, RestaurantCardStats>
  >(initial.statsByRestaurantId);
  const [error, setError] = useState<string | null>(
    initial.error ? formatSupabaseClientError(initial.error) : null
  );
  const [flashedIds, setFlashedIds] = useState<Set<string>>(new Set());
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const knownIds = useRef<Set<string>>(new Set(initial.restaurants.map((r) => r.id)));

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

  useEffect(() => {
    const flashMap = flashTimers.current;
    return () => {
      flashMap.forEach((timer) => clearTimeout(timer));
      flashMap.clear();
    };
  }, []);

  const applyPayload = useCallback(
    (payload: LocationsPayload) => {
      if (payload.error) {
        setError(formatSupabaseClientError(payload.error));
        return;
      }
      setError(null);
      for (const r of payload.restaurants) {
        if (!knownIds.current.has(r.id)) {
          knownIds.current.add(r.id);
          flash(r.id);
        }
      }
      setRestaurants(payload.restaurants);
      setProfilesByRestaurantId(payload.profilesByRestaurantId);
      setStatsByRestaurantId(payload.statsByRestaurantId);
    },
    [flash]
  );

  const live = usePoll<LocationsPayload>(
    (signal) => fetchLiveJson<LocationsPayload>(liveEndpoints.locations(), signal),
    {
      onData: applyPayload,
      onError: (err, failures) => {
        if (failures >= 2 && restaurants.length === 0) setError(formatSupabaseClientError(err.message));
      },
      immediate: false,
      // Card stats fan out over several tables; a calmer cadence than the KDS.
      timing: { intervalMs: 10_000, hiddenIntervalMs: 30_000 },
    }
  );
  const loadRestaurants = live.refresh;

  const portfolio = useMemo(
    () => buildPortfolioSummary(statsByRestaurantId),
    [statsByRestaurantId]
  );

  const count = restaurants.length;

  return (
    <div className="locations-page org-page org-page--wide min-w-0 space-y-5 overflow-x-clip">
      <PageHeader
        className="!mb-0"
        title="All locations"
        subtitle={
          error
            ? "Every restaurant in your organization, updated live."
            : count === 0
              ? "No locations yet. Add one to get a phone host answering calls."
              : `${count} location${count === 1 ? "" : "s"} · status and orders update live.`
        }
        actions={<CreateRestaurantButton href={ADD_LOCATION_HREF} />}
      />
      {error ? (
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
  const allLive =
    summary.totalLocations > 0 && summary.locationsReadyForCalls === summary.totalLocations;
  return (
    <section
      className="locations-portfolio min-w-0"
      aria-labelledby="locations-portfolio-heading"
    >
      <h2 id="locations-portfolio-heading" className="sr-only">
        Organization portfolio
      </h2>
      <div className="locations-portfolio__grid grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
        <StatCard label="Locations" value={summary.totalLocations} icon={Store} color="ink" />
        <StatCard
          label="Live"
          value={summary.locationsReadyForCalls}
          hint={allLive ? "All answering calls" : `of ${summary.totalLocations} ready for calls`}
          icon={Radio}
          color="green"
        />
        <StatCard label="On calls now" value={summary.activeCallsNow} icon={PhoneCall} color="amber" />
        <StatCard
          label="Orders (24h)"
          value={summary.successfulOrdersInPeriod}
          icon={ShoppingBag}
          color="orange"
        />
        <StatCard
          label="Follow-ups"
          value={summary.openFollowUps}
          icon={MessageSquareText}
          color="blue"
        />
        <StatCard
          label="Needs attention"
          value={summary.locationsNeedingAttention}
          hint={summary.locationsNeedingAttention > 0 ? "Open a location to fix" : "Nothing blocking"}
          icon={AlertTriangle}
          color="rose"
        />
      </div>
    </section>
  );
}

type LocationStatus = { label: string; tone: Tone };

function locationStatus(
  provisionState: VoiceProvisionUiState,
  stats: RestaurantCardStats | null,
  isReady: boolean
): LocationStatus {
  if (isReady) return { label: "Live", tone: "live" };
  if (provisionState === "needs_attention" || stats?.syncError) {
    return { label: "Needs attention", tone: "bad" };
  }
  return { label: "Setting up", tone: "warn" };
}

const HOST_LABEL: Record<VoiceProvisionUiState, string> = {
  ready: "Host ready",
  in_progress: "Host setting up",
  needs_attention: "Host needs attention",
  not_started: "Host not set up",
};

const HOST_TONE: Record<VoiceProvisionUiState, Tone> = {
  ready: "ok",
  in_progress: "warn",
  needs_attention: "bad",
  not_started: "neutral",
};

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
  const overviewHref = `/dashboard/restaurants/${restaurant.id}/overview`;
  const callsHref = `/dashboard/restaurants/${restaurant.id}/calls`;
  const kitchenHref = restaurantLiveOrdersHref(restaurant.id);
  const menuHref = restaurantMenuSetupHref(restaurant.id);
  const agentHref = restaurantVoiceAgentHref(restaurant.id);
  const place = profile?.address_line1?.trim() || null;
  const isReady = stats?.readyForCalls ?? provisionState === "ready";
  const status = locationStatus(provisionState, stats, isReady);
  const nextAction = !isReady ? stats?.nextBestAction ?? null : null;

  return (
    <article
      className={cn(
        "locations-card org-location-card org-rise panel flex h-full min-w-0 flex-col",
        flashed && "flash-row"
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex min-w-0 items-start gap-3 px-4 pt-4">
        <IconTile icon={Store} color={isReady ? "green" : "orange"} />
        <div className="min-w-0 flex-1">
          <h2 className="locations-card__title min-w-0">
            <Link
              href={overviewHref}
              className="locations-card__title-link org-location-card__title-link block truncate text-[15px] font-semibold tracking-tight text-ink hover:underline"
              title={restaurant.name}
              aria-label={`Open ${restaurant.name}`}
            >
              {restaurant.name}
            </Link>
          </h2>
          <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[12.5px] text-subtle">
            {place ? <MapPin size={12} strokeWidth={2} className="shrink-0" aria-hidden /> : null}
            <span className="truncate">{place ?? `Added ${formatDate(restaurant.created_at)}`}</span>
          </p>
        </div>
        <Badge tone={status.tone} className="shrink-0">
          {status.label}
        </Badge>
      </div>

      <div className="locations-card__meta mt-3 flex min-w-0 flex-wrap gap-1.5 px-4">
        <Badge tone={HOST_TONE[provisionState]} title={voiceProvisionBadgeTitle(provisionState)}>
          {HOST_LABEL[provisionState]}
        </Badge>
        {stats ? (
          <Badge tone={menuSyncTone(stats.menuSyncPhase)}>
            Menu {menuSyncLabel(stats.menuSyncPhase)}
          </Badge>
        ) : null}
        {stats && stats.activeCallCount > 0 ? (
          <Badge tone="live" title="Calls in progress">
            {stats.activeCallCount} on call
          </Badge>
        ) : null}
      </div>

      <dl className="locations-card__stats mx-4 mt-3 grid grid-cols-3 overflow-hidden rounded-[10px] border border-line bg-line gap-px">
        <StatItem
          label="Orders (24h)"
          value={stats ? String(stats.successfulOrdersInPeriod) : "—"}
          strong
        />
        <StatItem label="Calls now" value={stats ? String(stats.activeCallCount) : "—"} />
        <StatItem label="Last order" value={formatLastOrderAt(stats?.lastOrderAt ?? null)} />
        <StatItem
          label="Follow-ups"
          value={stats ? String(stats.openFollowUpCount) : "—"}
        />
        <StatItem
          label="Reservations"
          value={stats ? String(stats.openReservationCount) : "—"}
        />
        <StatItem label="Menu items" value={stats ? String(stats.menuItemCount) : "—"} />
      </dl>

      {stats?.syncError ? (
        <p
          className="locations-card__sync-error mx-4 mt-3 rounded-lg border border-danger/20 bg-danger/5 px-2.5 py-1.5 text-[12px] text-danger [overflow-wrap:anywhere]"
          role="alert"
        >
          {stats.syncError}
        </p>
      ) : null}

      <div className="locations-card__actions mt-auto px-4 pb-4 pt-4">
        <div className="flex min-w-0 flex-wrap gap-2">
          <Link href={overviewHref} className="btn-primary min-w-0 flex-1">
            Open
            <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
          </Link>
          {nextAction ? (
            <Link href={nextAction.href} className="btn-ghost min-w-0 max-w-full flex-1 truncate">
              {nextAction.label}
            </Link>
          ) : null}
        </div>
        <nav
          className="mt-2 grid grid-cols-2 gap-1 border-t border-line pt-2"
          aria-label={`${restaurant.name} shortcuts`}
        >
          <FastPathLink href={callsHref} icon={PhoneCall}>Calls &amp; Orders</FastPathLink>
          <FastPathLink href={kitchenHref} icon={ChefHat}>Kitchen</FastPathLink>
          <FastPathLink href={menuHref} icon={BookOpen}>Menu</FastPathLink>
          <FastPathLink href={agentHref} icon={Headphones}>Phone host</FastPathLink>
        </nav>
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

function StatItem({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="locations-card__stat min-w-0 bg-card px-2.5 py-2">
      <dt className="truncate text-[11.5px] text-subtle">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-[13.5px] font-semibold tabular-nums",
          strong ? "text-money" : "text-ink"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function FastPathLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof PhoneCall;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="org-fast-link justify-start">
      <Icon size={14} strokeWidth={2} className="shrink-0 text-subtle" aria-hidden />
      <span className="truncate">{children}</span>
    </Link>
  );
}

export function LocationsLoadingState({ "aria-busy": ariaBusy }: { "aria-busy"?: "true" }) {
  return (
    <>
      <div className="locations-portfolio-skeleton grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="stat-card">
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton mt-1 h-6 w-1/3 rounded" />
          </div>
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
          <div key={idx} className="locations-card-skeleton panel flex min-w-0 flex-col p-4">
            <div className="flex items-start gap-3">
              <div className="skeleton h-8 w-8 shrink-0 rounded-[9px]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="skeleton h-4 w-2/3 max-w-full rounded" />
                <div className="skeleton h-3 w-1/3 max-w-full rounded" />
              </div>
            </div>
            <div className="mt-3 flex gap-1.5">
              <div className="skeleton h-5 w-20 rounded-md" />
              <div className="skeleton h-5 w-16 rounded-md" />
            </div>
            <div className="skeleton mt-3 h-[104px] rounded-[10px]" />
            <div className="skeleton mt-4 h-9 rounded-[10px]" />
            <div className="mt-2 grid grid-cols-2 gap-1 border-t border-line pt-2">
              {Array.from({ length: 4 }).map((__, linkIdx) => (
                <div key={linkIdx} className="skeleton h-8 rounded-md" />
              ))}
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
    <div className="locations-page__state locations-page__state--error panel min-w-0">
      <div className="flex min-w-0 items-start gap-3 p-5">
        <IconTile icon={AlertTriangle} color="rose" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold text-ink">Could not load locations</h3>
          <p
            className="locations-page__error-text mt-1 text-[13px] text-danger [overflow-wrap:anywhere]"
            role="alert"
          >
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
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="locations-page__state locations-page__state--empty panel mx-auto max-w-xl min-w-0">
      <UiEmptyState
        icon={Store}
        className="py-12"
        title="Set up your first location"
        body="Paste your menu link. ROAL builds a phone host that answers calls, takes pickup orders, and sends tickets to the kitchen. About two minutes."
        action={
          <div className="flex flex-col items-center gap-2">
            <CreateRestaurantButton label="Set up a location" href="/dashboard/onboarding" />
            <p className="text-[12px] text-subtle">$0.90 per completed order. No monthly fee.</p>
          </div>
        }
      />
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
