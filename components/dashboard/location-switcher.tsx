"use client";

import Link from "next/link";
import { Check, ChevronDown, LayoutGrid, MapPin, Plus } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { switchLocationHref } from "@/lib/dashboard-nav";
import {
  shellLocationStatus,
  type ShellLocation,
  type ShellLocationStatus,
} from "@/lib/dashboard/shell-data";
import { usePopover } from "@/lib/dashboard/use-popover";

const STATUS_BADGE: Record<ShellLocationStatus, { tone: "ok" | "warn" | "neutral"; label: string }> = {
  live: { tone: "ok", label: "Active" },
  paused: { tone: "warn", label: "Paused" },
  setup: { tone: "neutral", label: "Setting up" },
};

export function LocationStatusBadge({ location }: { location: Pick<ShellLocation, "isLive" | "temporarilyClosed"> }) {
  const status = STATUS_BADGE[shellLocationStatus(location)];
  return <Badge tone={status.tone}>{status.label}</Badge>;
}

/** Top-right pill: current location + status, dropdown to switch / add locations. */
export function LocationSwitcher({
  current,
  locations,
  pathname,
  canManageLocations,
  onNavigate,
}: {
  current: ShellLocation | null;
  locations: ShellLocation[];
  pathname: string;
  canManageLocations: boolean;
  onNavigate?: (restaurantId: string) => void;
}) {
  const { open, toggle, close, rootRef, triggerRef } = usePopover<HTMLDivElement>();

  if (!current) {
    return canManageLocations ? (
      <Link href="/dashboard/onboarding?new=1" className="btn-primary btn-sm shrink-0">
        <Plus size={14} aria-hidden /> Add location
      </Link>
    ) : null;
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="location-switcher-menu"
        className="location-pill flex h-9 min-w-0 max-w-[min(18rem,52vw)] items-center gap-2 rounded-full border border-line bg-card pl-2.5 pr-2 text-[13px] font-medium text-ink shadow-sm transition-colors hover:border-line-strong"
      >
        <MapPin size={15} className="shrink-0 text-accent" aria-hidden />
        <span className="min-w-0 truncate" title={current.name}>
          {current.name}
        </span>
        <span className="hidden shrink-0 sm:inline-flex">
          <LocationStatusBadge location={current} />
        </span>
        <ChevronDown
          size={15}
          className={cn("shrink-0 text-subtle transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id="location-switcher-menu"
          className="app-popover absolute right-0 top-[calc(100%+6px)] z-50 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-line bg-card p-1.5 shadow-lg"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-subtle">
            Locations
          </p>
          <ul className="max-h-[50vh] overflow-y-auto" role="list">
            {locations.map((location) => {
              const active = location.id === current.id;
              return (
                <li key={location.id}>
                  <Link
                    href={switchLocationHref(pathname, current.id, location.id)}
                    onClick={() => {
                      onNavigate?.(location.id);
                      close();
                    }}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-[13px] hover:bg-elev lg:min-h-9",
                      active ? "font-semibold text-ink" : "text-muted"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate" title={location.name}>
                      {location.name}
                    </span>
                    <LocationStatusBadge location={location} />
                    <Check
                      size={14}
                      className={cn("shrink-0", active ? "text-ink" : "invisible")}
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          {canManageLocations ? (
            <div className="mt-1 border-t border-line pt-1">
              <Link
                href="/dashboard/restaurants"
                onClick={() => close()}
                className="flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-[13px] text-muted hover:bg-elev hover:text-ink lg:min-h-9"
              >
                <LayoutGrid size={15} className="text-subtle" aria-hidden />
                All locations
              </Link>
              <Link
                href="/dashboard/onboarding?new=1"
                onClick={() => close()}
                className="flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-[13px] text-muted hover:bg-elev hover:text-ink lg:min-h-9"
              >
                <Plus size={15} className="text-subtle" aria-hidden />
                Add location
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
