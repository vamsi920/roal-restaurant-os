"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  buildRestaurantWorkspaceNav,
  isRestaurantWorkspaceNavActive,
  restaurantWorkspaceMobileNavLabel,
} from "@/lib/restaurant-workspace-nav";
import { cn } from "@/lib/cn";

type Props = {
  restaurantId: string;
  restaurantName: string;
  hasRestaurantAnalytics?: boolean;
  hasRestaurantBilling?: boolean;
  children: React.ReactNode;
};

export function RestaurantWorkspaceRail({
  restaurantId,
  restaurantName,
  hasRestaurantAnalytics = false,
  hasRestaurantBilling = true,
  children,
}: Props) {
  const pathname = usePathname();
  const nav = buildRestaurantWorkspaceNav({
    restaurantId,
    hasLiveAgentRoute: true,
    hasRestaurantAnalytics,
    hasRestaurantBilling,
  });

  return (
    <div className="kds-workspace kds-workspace--with-rail max-w-full overflow-x-clip">
      <div className="workspace-rail-mobile-top sticky top-14 z-20 border-b border-line/90 bg-base/90 backdrop-blur-xl sm:hidden">
        <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
          <Link
            href="/dashboard/restaurants"
            className="workspace-rail-back inline-flex min-h-11 min-w-0 max-w-[45%] items-center gap-1 rounded-md px-1 text-xs font-medium text-muted hover:bg-elev hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="truncate">Locations</span>
          </Link>
          <p
            className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-ink"
            title={restaurantName}
          >
            {restaurantName}
          </p>
        </div>
      </div>

      <div className="flex gap-3 sm:gap-5 lg:gap-6">
        <aside className="workspace-rail-desktop hidden w-40 shrink-0 space-y-3 border-r border-line pr-2 pt-1 sm:block lg:w-44 lg:pr-3">
          <Link
            href="/dashboard/restaurants"
            className="workspace-rail-back inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted hover:bg-elev hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="truncate">All locations</span>
          </Link>

          <div className="min-w-0 space-y-1 px-2">
            <p className="truncate text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-subtle">
              Location
            </p>
            <p className="truncate text-sm font-semibold text-ink" title={restaurantName}>
              {restaurantName}
            </p>
          </div>

          <nav aria-label="Location workspace" className="space-y-0.5 px-1 text-sm">
            {nav.map((item) => {
              const active = isRestaurantWorkspaceNavActive(item.id, pathname, restaurantId);

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  className={cn(
                    "workspace-rail-desktop__link flex min-h-10 items-center rounded-md px-2.5 py-2",
                    active
                      ? "workspace-rail-desktop__link--active bg-elev font-semibold text-ink"
                      : "text-muted hover:bg-elev hover:text-ink"
                  )}
                >
                  <span className="truncate text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="kds-workspace__main min-w-0 flex-1 space-y-4 sm:space-y-5">{children}</div>
      </div>

      <nav
        aria-label="Restaurant workspace"
        className="workspace-rail-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/90 bg-base/95 backdrop-blur-xl sm:hidden"
      >
        <ul className="workspace-rail-bottom__list m-0 grid list-none grid-cols-5 p-0">
          {nav.map((item) => {
            const active = isRestaurantWorkspaceNavActive(item.id, pathname, restaurantId);
            const shortLabel = restaurantWorkspaceMobileNavLabel(item.id);

            return (
              <li key={item.id} className="min-w-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  title={item.label}
                  className={cn(
                    "workspace-rail-bottom__link flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-micro font-medium transition-colors",
                    active
                      ? "workspace-rail-bottom__link--active text-accent"
                      : "text-subtle hover:bg-elev/80 hover:text-ink"
                  )}
                >
                  {renderRailIcon(item.id, active)}
                  <span className="workspace-rail-bottom__label max-w-full truncate px-0.5">
                    {shortLabel}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function renderRailIcon(id: string, active: boolean) {
  const cls = active ? "text-accent" : "text-subtle";
  switch (id) {
    case "orders":
      return (
        <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 2h12" />
          <path d="M6 22h12" />
          <path d="M9 2v20" />
          <path d="M15 2v20" />
          <path d="M4 6h16" />
          <path d="M4 18h16" />
        </svg>
      );
    case "menu":
      return (
        <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
          <path d="M10 6v12" />
        </svg>
      );
    case "liveAgent":
      return (
        <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4z" />
          <path d="M8 15v1a4 4 0 0 0 8 0v-1" />
          <path d="M12 19v2" />
        </svg>
      );
    case "analytics":
      return (
        <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 15v-3" />
          <path d="M12 15V9" />
          <path d="M16 15V7" />
        </svg>
      );
    case "billing":
      return (
        <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 7h18" />
          <path d="M3 17h18" />
          <path d="M5 7v10" />
          <path d="M19 7v10" />
          <path d="M8 12h2" />
        </svg>
      );
    default:
      return null;
  }
}
