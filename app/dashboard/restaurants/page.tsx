"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
      setError(error.message);
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
        (payload) => {
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
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-subtle">
            <span className="h-px w-6 bg-line" />
            Dashboard
          </div>
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Your <span className="gradient-text">restaurants</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-pretty text-sm text-muted">
            Spin up a workspace per location. Upload a menu photo and watch
            ROAL extract categories, items, and modifiers in real time.
          </p>
        </div>
        <div className="w-full shrink-0 sm:w-auto">
          <CreateRestaurantButton className="w-full sm:w-auto" />
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={loadRestaurants} />
      ) : restaurants.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {restaurants.map((r, idx) => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              index={idx}
              flashed={flashedIds.has(r.id)}
            />
          ))}
        </div>
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
  return (
    <Link
      href={`/dashboard/restaurants/${restaurant.id}`}
      className={cn(
        "group glass-card relative isolate block overflow-hidden p-5 text-ink no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong",
        flashed && "flash-row"
      )}
      style={{
        animation: `slide-up 280ms cubic-bezier(0.21, 1.02, 0.73, 1) ${index * 40}ms forwards`,
      }}
    >
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-accent/14 blur-3xl" />
      </div>

      <div className="relative flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-elev text-accent shadow-sm">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l9-8 9 8" />
            <path d="M5 9v11a1 1 0 001 1h3v-7h6v7h3a1 1 0 001-1V9" />
          </svg>
        </div>
        <span className="chip">
          <span className="pulse-dot" />
          Live
        </span>
      </div>

      <div className="relative z-10 mt-5">
        <h3
          className="truncate text-base font-semibold tracking-tight !text-black"
          style={{ color: "#000000" }}
        >
          {restaurant.name}
        </h3>
        <p className="mt-1 text-xs text-subtle">
          Created {formatDate(restaurant.created_at)}
        </p>
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
        <span className="font-mono-tabular text-subtle">
          {restaurant.id.slice(0, 8)}
        </span>
        <span className="flex items-center gap-1 text-accent opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
          Open KDS
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="glass-card p-5">
          <div className="skeleton h-10 w-10 rounded-lg" />
          <div className="mt-5 space-y-2">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-3 w-1/3" />
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <div className="skeleton h-3 w-1/2" />
          </div>
        </div>
      ))}
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
  return (
    <div className="glass-card p-8">
      <h3 className="text-lg font-semibold">Could not load restaurants</h3>
      <p className="mt-2 text-sm text-danger">{error}</p>
      <button
        type="button"
        className="btn-primary mt-4"
        onClick={() => void onRetry()}
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-card relative overflow-hidden p-8 text-center sm:p-12">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
      <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-xl border border-line bg-card shadow-sm">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-accent" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 012-2h3l2 2h9a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      </div>
      <h3 className="relative mt-5 text-lg font-semibold">No restaurants yet</h3>
      <p className="relative mx-auto mt-2 max-w-md text-sm text-muted">
        Create your first restaurant to start scanning menus.
      </p>
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
