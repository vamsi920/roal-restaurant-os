"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  buildRestaurantWorkspaceNav,
  isRestaurantWorkspaceNavActive,
  restaurantWorkspaceMobileNavLabel,
  type RestaurantWorkspaceDestinationId,
} from "@/lib/restaurant-workspace-nav";
import { cn } from "@/lib/cn";

type Props = {
  restaurantId: string;
  restaurantName: string;
  hasRestaurantAnalytics?: boolean;
  hasRestaurantBilling?: boolean;
  /** Pending "couldn't answer" suggestions; shows as a badge on Phone host. */
  suggestionCount?: number;
  children: React.ReactNode;
};

export function RestaurantWorkspaceRail({
  restaurantId,
  restaurantName,
  hasRestaurantAnalytics = true,
  hasRestaurantBilling = true,
  suggestionCount = 0,
  children,
}: Props) {
  const pathname = usePathname();
  const nav = buildRestaurantWorkspaceNav({
    restaurantId,
    hasLiveAgentRoute: true,
    hasRestaurantAnalytics,
    hasRestaurantBilling,
  });

  const badgeFor = (id: RestaurantWorkspaceDestinationId) =>
    id === "liveAgent" && suggestionCount > 0 ? suggestionCount : 0;

  return (
    <div className="kds-workspace kds-workspace--with-rail max-w-full overflow-x-clip">
      <div className="workspace-rail-mobile-top sticky top-14 z-20 border-b border-line bg-base/95 backdrop-blur-xl sm:hidden">
        <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-1.5">
          <Link
            href="/dashboard/restaurants"
            className="workspace-rail-back inline-flex min-h-11 min-w-0 max-w-[45%] items-center gap-1 rounded-md px-1 text-xs font-medium text-muted hover:bg-elev hover:text-ink"
          >
            <BackIcon />
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

      <div className="flex gap-4 sm:gap-6 lg:gap-8">
        <aside className="workspace-rail-desktop hidden w-40 shrink-0 sm:block lg:w-48">
          <div className="workspace-rail-desktop__sticky space-y-4">
            <Link
              href="/dashboard/restaurants"
              className="workspace-rail-back inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted hover:bg-elev hover:text-ink"
            >
              <BackIcon />
              <span className="truncate">All locations</span>
            </Link>

            <div className="min-w-0 px-2">
              <p className="truncate text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-subtle">
                Location
              </p>
              <p
                className="mt-0.5 truncate font-display text-[15px] font-semibold tracking-tight text-ink"
                title={restaurantName}
              >
                {restaurantName}
              </p>
            </div>

            <nav aria-label="Location workspace" className="space-y-0.5">
              {nav.map((item) => {
                const active = isRestaurantWorkspaceNavActive(item.id, pathname, restaurantId);
                const badge = badgeFor(item.id);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={item.label}
                    className={cn(
                      "workspace-rail-desktop__link flex min-h-9 items-center gap-2.5 rounded-md px-2 text-[13px]",
                      active
                        ? "workspace-rail-desktop__link--active bg-card font-semibold text-ink shadow-sm ring-1 ring-line"
                        : "font-medium text-muted hover:bg-elev hover:text-ink"
                    )}
                  >
                    <span
                      className={cn(
                        "workspace-rail-desktop__icon shrink-0",
                        active ? "text-accent" : "text-subtle"
                      )}
                    >
                      {renderRailIcon(item.id)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {badge > 0 ? (
                      <span
                        className="workspace-rail__badge"
                        aria-label={`${badge} pending question${badge === 1 ? "" : "s"}`}
                      >
                        {badge > 9 ? "9+" : badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="kds-workspace__main min-w-0 flex-1">{children}</div>
      </div>

      <nav
        aria-label="Restaurant workspace"
        className="workspace-rail-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-base/95 backdrop-blur-xl sm:hidden"
      >
        <ul
          className="workspace-rail-bottom__list m-0 grid list-none p-0"
          style={{
            gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))`,
          }}
        >
          {nav.map((item) => {
            const active = isRestaurantWorkspaceNavActive(item.id, pathname, restaurantId);
            const shortLabel = restaurantWorkspaceMobileNavLabel(item.id);
            const badge = badgeFor(item.id);

            return (
              <li key={item.id} className="min-w-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  title={item.label}
                  className={cn(
                    "workspace-rail-bottom__link relative flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-micro font-medium transition-colors",
                    active
                      ? "workspace-rail-bottom__link--active text-accent"
                      : "text-subtle hover:bg-elev/80 hover:text-ink"
                  )}
                >
                  <span className={active ? "text-accent" : "text-subtle"}>
                    {renderRailIcon(item.id)}
                  </span>
                  {badge > 0 ? (
                    <span className="workspace-rail__badge workspace-rail__badge--float" aria-hidden>
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
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

function BackIcon() {
  return (
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
  );
}

const ICON_CLS = "h-[18px] w-[18px] shrink-0";
const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function renderRailIcon(id: RestaurantWorkspaceDestinationId) {
  switch (id) {
    case "orders":
      return (
        <svg className={ICON_CLS} {...ICON_PROPS}>
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
          <path d="M9 8h6M9 12h6" />
        </svg>
      );
    case "menu":
      return (
        <svg className={ICON_CLS} {...ICON_PROPS}>
          <path d="M4 5h16M4 12h16M4 19h10" />
        </svg>
      );
    case "liveAgent":
      return (
        <svg className={ICON_CLS} {...ICON_PROPS}>
          <path d="M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4z" />
          <path d="M7 11a5 5 0 0 0 10 0M12 16v4M9 20h6" />
        </svg>
      );
    case "calls":
      return (
        <svg className={ICON_CLS} {...ICON_PROPS}>
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.8 2.1Z" />
        </svg>
      );
    case "settings":
      return (
        <svg className={ICON_CLS} {...ICON_PROPS}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
    case "analytics":
      return (
        <svg className={ICON_CLS} {...ICON_PROPS}>
          <path d="M4 20V4M4 20h16" />
          <path d="M8 16v-4M12 16V8M16 16v-6" />
        </svg>
      );
    case "billing":
      return (
        <svg className={ICON_CLS} {...ICON_PROPS}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18M7 15h3" />
        </svg>
      );
    default:
      return null;
  }
}
