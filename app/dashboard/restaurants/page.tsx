"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { formatSupabaseClientError } from "@/lib/dashboard/format-user-error";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import type { Restaurant } from "@/lib/types";
import { CreateRestaurantButton } from "./CreateRestaurantButton";

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashedIds, setFlashedIds] = useState<Set<string>>(new Set());
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(formatSupabaseClientError(error.message));
      return;
    }

    setRestaurants((data ?? []) as Restaurant[]);
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    loadRestaurants().finally(() => setLoading(false));

    const channel = supabase
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
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Restaurant;
            setRestaurants((prev) =>
              prev.map((r) => (r.id === row.id ? row : r))
            );
            flash(row.id);
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as Restaurant;
            setRestaurants((prev) => prev.filter((r) => r.id !== row.id));
          }
        }
      )
      .subscribe();

    const timers = flashTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      supabase.removeChannel(channel);
    };
  }, [flash, loadRestaurants]);

  return (
    <div className="locations-page min-w-0 space-y-6 overflow-x-clip sm:space-y-8">
      <header className="locations-page__header flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Locations
          </h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted sm:text-[0.9375rem]">
            Choose a location to open its workspace.
          </p>
        </div>
        <div className="w-full shrink-0 sm:w-auto">
          <CreateRestaurantButton className="w-full sm:w-auto" />
        </div>
      </header>

      {loading ? (
        <LoadingState aria-busy="true" />
      ) : error ? (
        <ErrorState error={error} onRetry={loadRestaurants} />
      ) : restaurants.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="locations-page__grid grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 md:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
          {restaurants.map((r, idx) => (
            <li key={r.id}>
              <RestaurantCard
                restaurant={r}
                index={idx}
                flashed={flashedIds.has(r.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RestaurantCard({
  restaurant,
  index,
  flashed,
}: {
  restaurant: Restaurant;
  index: number;
  flashed: boolean;
}) {
  const liveOrdersHref = `/dashboard/restaurants/${restaurant.id}`;

  return (
    <Link
      href={liveOrdersHref}
      className={cn(
        "locations-card glass-card flex h-full min-w-0 flex-col p-4 transition-colors duration-200 sm:p-5",
        flashed && "flash-row"
      )}
      style={{
        animation: `slide-up 280ms cubic-bezier(0.21, 1.02, 0.73, 1) ${index * 40}ms forwards`,
      }}
      aria-label={`Open ${restaurant.name}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-elev text-accent"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l9-8 9 8" />
            <path d="M5 9v11a1 1 0 001 1h3v-7h6v7h3a1 1 0 001-1V9" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h2
            className="locations-card__title truncate text-base font-semibold tracking-tight text-ink sm:text-[1.0625rem]"
            title={restaurant.name}
          >
            {restaurant.name}
          </h2>
          <p className="mt-0.5 text-xs text-subtle">
            Added {formatDate(restaurant.created_at)}
          </p>
        </div>
      </div>

      <span className="locations-card__cta btn-primary mt-4 inline-flex min-h-11 w-full items-center justify-center border-t border-line px-3 pt-4 text-sm font-semibold sm:mt-5">
        Open location
      </span>
    </Link>
  );
}

function LoadingState({ "aria-busy": ariaBusy }: { "aria-busy"?: "true" }) {
  return (
    <div
      className="locations-page__grid grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3 2xl:grid-cols-4"
      role="status"
      aria-live="polite"
      aria-busy={ariaBusy}
      aria-label="Loading restaurants"
    >
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="locations-card-skeleton glass-card flex min-w-0 flex-col p-4 sm:p-5">
          <div className="flex gap-3">
            <div className="skeleton h-10 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4 max-w-full" />
              <div className="skeleton h-3 w-1/3 max-w-full" />
            </div>
          </div>
          <div className="skeleton mt-4 min-h-11 w-full rounded-lg border-t border-line pt-4 sm:mt-5" />
        </div>
      ))}
      <span className="sr-only">Loading restaurants…</span>
    </div>
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
    <div className="locations-page__state locations-page__state--error glass-card min-w-0 p-6 sm:p-8">
      <h3 className="text-lg font-semibold text-ink">Could not load restaurants</h3>
      <p className="locations-page__error-text mt-2 text-sm text-danger" role="alert">
        {error}
      </p>
      <button
        type="button"
        className="btn-primary locations-page__retry mt-4 min-h-11"
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
    <div className="locations-page__state locations-page__state--empty glass-card relative min-w-0 overflow-hidden p-6 text-center sm:p-12">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
      <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-xl border border-line bg-card shadow-sm">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-accent" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 012-2h3l2 2h9a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      </div>
      <h3 className="relative mt-5 text-lg font-semibold">No locations yet</h3>
      <p className="relative mx-auto mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted">
        Add your first location to get started.
      </p>
      <div className="relative mt-6 flex justify-center">
        <CreateRestaurantButton />
      </div>
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
