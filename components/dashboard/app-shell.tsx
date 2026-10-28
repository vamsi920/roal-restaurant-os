"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronsUpDown,
  ExternalLink,
  LifeBuoy,
  LogOut,
  Menu as MenuIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import { RoalMark } from "@/components/brand/roal-mark";
import { cn } from "@/lib/cn";
import {
  LAST_RESTAURANT_COOKIE,
  SIDEBAR_COLLAPSED_KEY,
  SUPPORT_NAV_ITEM,
  buildLocationNav,
  isDashboardNavActive,
  isLocationNavActive,
  resolveCurrentRestaurantId,
  restaurantIdFromPath,
  restaurantOverviewHref,
  visibleOrgNav,
  type DashboardNavItem,
  type LocationNavItem,
} from "@/lib/dashboard-nav";
import type { ShellLocation } from "@/lib/dashboard/shell-data";
import { useAppShellNav } from "@/lib/dashboard/use-app-shell-nav";
import { usePopover } from "@/lib/dashboard/use-popover";
import { LocationSwitcher } from "./location-switcher";
import { NavIcon, navIconKeyForHref } from "./nav-icon";
import { TakingOrdersCard } from "./taking-orders-card";
import { VoiceHostKeeper } from "./voice-host-keeper";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode: preference is per-view only.
  }
}

function rememberRestaurant(id: string) {
  writeStorage(LAST_RESTAURANT_COOKIE, id);
  try {
    document.cookie = `${LAST_RESTAURANT_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Cookies disabled: localStorage fallback still works client-side.
  }
}

export function AppShell({
  children,
  userEmail,
  userName = null,
  organizationName,
  roleLabel,
  locations = [],
  lastRestaurantId = null,
  showAdminNav,
  showOrgAdminNav = false,
}: {
  children: ReactNode;
  userEmail: string;
  userName?: string | null;
  organizationName: string | null;
  roleLabel: string | null;
  locations?: ShellLocation[];
  lastRestaurantId?: string | null;
  showAdminNav: boolean;
  showOrgAdminNav?: boolean;
}) {
  const pathname = usePathname() ?? "/dashboard";
  const {
    mobileOpen,
    closeMenu,
    toggleMenu,
    menuButtonRef,
    sidebarRef,
    onBackdropClose,
  } = useAppShellNav();

  const [collapsed, setCollapsed] = useState(false);
  const [remembered, setRemembered] = useState<string | null>(lastRestaurantId);
  const [hash, setHash] = useState("");

  useEffect(() => {
    setCollapsed(readStorage(SIDEBAR_COLLAPSED_KEY) === "1");
    if (!lastRestaurantId) setRemembered(readStorage(LAST_RESTAURANT_COOKIE));
  }, [lastRestaurantId]);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  const restaurantIds = useMemo(() => locations.map((l) => l.id), [locations]);
  const currentId = resolveCurrentRestaurantId({ pathname, remembered, restaurantIds });

  useEffect(() => {
    const fromPath = restaurantIdFromPath(pathname);
    if (fromPath && fromPath !== remembered) {
      rememberRestaurant(fromPath);
      setRemembered(fromPath);
    }
  }, [pathname, remembered]);

  const current: ShellLocation | null = useMemo(() => {
    if (!currentId) return null;
    return (
      locations.find((l) => l.id === currentId) ?? {
        id: currentId,
        name: "This location",
        organizationId: "",
        organizationName,
        agentDisplayName: null,
        temporarilyClosed: false,
        provisionStatus: null,
        isLive: false,
        pendingQuestions: 0,
      }
    );
  }, [currentId, locations, organizationName]);

  const locationNav = current
    ? buildLocationNav(current.id, { pendingQuestions: current.pendingQuestions })
    : [];
  // Owners see only what runs their restaurant: staff tools live in the account menu, and the
  // organization section appears once there is more than one location to organize.
  const orgNav = visibleOrgNav({ showAdminNav, showOrgAdminNav })
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.platformOnly) }))
    .filter((group) => group.items.length > 0 && locations.length > 1);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeStorage(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  // The mobile drawer always shows labels.
  const compact = collapsed && !mobileOpen;

  const onSwitchLocation = useCallback((id: string) => {
    rememberRestaurant(id);
    setRemembered(id);
  }, []);

  return (
    <div className="app-shell-root flex min-h-[100dvh] min-w-0 overflow-x-clip bg-base">
      <a href="#app-main-content" className="app-shell-skip">
        Skip to content
      </a>

      <aside
        id="app-sidebar"
        ref={sidebarRef}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label="App navigation"
        data-collapsed={compact ? "true" : undefined}
        className={cn(
          "app-shell-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,17rem)] flex-col border-r border-line bg-card pt-[env(safe-area-inset-top)] transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-[100dvh] lg:translate-x-0 lg:shrink-0",
          compact ? "lg:w-[68px]" : "lg:w-[232px]",
          mobileOpen ? "app-shell-sidebar--open translate-x-0" : "-translate-x-full"
        )}
      >
        <div className={cn("flex h-14 shrink-0 items-center gap-2 px-3", compact && "lg:justify-center lg:px-2")}>
          <Link
            href={current ? restaurantOverviewHref(current.id) : "/dashboard"}
            className={cn("app-shell-brand flex min-h-11 min-w-0 flex-1 items-center rounded-md px-1.5 lg:min-h-9", compact && "lg:hidden")}
            onClick={closeMenu}
            aria-label="ROAL home"
          >
            <Wordmark />
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="app-shell-collapse hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-subtle hover:bg-elev hover:text-ink lg:inline-flex"
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={compact}
            title={compact ? "Expand sidebar" : "Collapse sidebar"}
          >
            {compact ? <PanelLeftOpen size={17} aria-hidden /> : <PanelLeftClose size={17} aria-hidden />}
          </button>
          <button
            type="button"
            onClick={onBackdropClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-subtle hover:bg-elev hover:text-ink lg:hidden"
            aria-label="Close navigation menu"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <nav
          className={cn("flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-1", compact && "lg:px-2")}
          aria-label="Sections"
        >
          {locationNav.length > 0 ? (
            <ul className="space-y-0.5">
              {locationNav.map((item) => (
                <li key={item.key}>
                  <NavLink
                    item={item}
                    active={isLocationNavActive(item.key, pathname, current!.id, hash)}
                    compact={compact}
                    onNavigate={closeMenu}
                  />
                </li>
              ))}
              <li>
                <NavLink
                  item={SUPPORT_NAV_ITEM}
                  active={isDashboardNavActive(SUPPORT_NAV_ITEM.href, pathname)}
                  compact={compact}
                  onNavigate={closeMenu}
                />
              </li>
            </ul>
          ) : (
            <ul className="space-y-0.5">
              <li>
                <NavLink
                  item={SUPPORT_NAV_ITEM}
                  active={isDashboardNavActive(SUPPORT_NAV_ITEM.href, pathname)}
                  compact={compact}
                  onNavigate={closeMenu}
                />
              </li>
            </ul>
          )}

          {orgNav.map((group) => (
            <div key={group.label} className="mt-5">
              <p className={cn("app-shell-nav-group-label px-2.5 pb-1.5", compact && "lg:sr-only")}>
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      item={item}
                      active={isDashboardNavActive(item.href, pathname)}
                      compact={compact}
                      onNavigate={closeMenu}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className={cn("app-shell-sidebar__footer shrink-0 space-y-2.5 px-3 pt-2", compact && "lg:px-2")}>
          <div className={cn(compact && "lg:hidden")}>
            <PromoCard current={current} onNavigate={closeMenu} />
          </div>
          {current && current.organizationId && current.isLive ? (
            <TakingOrdersCard location={current} collapsed={compact} />
          ) : null}
          <AccountCard
            userEmail={userEmail}
            userName={userName}
            subtitle={current?.name ?? organizationName ?? roleLabel}
            roleLabel={roleLabel}
            compact={compact}
            onNavigate={closeMenu}
            showStaffLink={showAdminNav}
          />
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="app-shell-backdrop fixed inset-0 z-40 bg-ink/25 lg:hidden"
          aria-label="Close navigation"
          onClick={onBackdropClose}
        />
      ) : null}

      <div
        className="app-shell-content flex min-w-0 flex-1 flex-col"
        {...(mobileOpen ? { inert: true as const } : {})}
      >
        <header className="app-shell-header sticky top-0 z-30 flex h-14 min-h-14 items-center gap-2 border-b border-line bg-base/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:px-6 lg:border-transparent lg:px-8">
          <button
            ref={menuButtonRef}
            type="button"
            className="app-shell-menu-btn -ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-elev lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="app-sidebar"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={toggleMenu}
          >
            {mobileOpen ? <X size={20} aria-hidden /> : <MenuIcon size={20} aria-hidden />}
          </button>
          <Link
            href={current ? restaurantOverviewHref(current.id) : "/dashboard"}
            className="flex min-h-11 items-center lg:hidden"
            aria-label="ROAL home"
          >
            <Wordmark />
          </Link>
          <div className="min-w-0 flex-1" />
          <LocationSwitcher
            current={current?.organizationId ? current : null}
            locations={locations}
            pathname={pathname}
            canManageLocations={showOrgAdminNav}
            onNavigate={onSwitchLocation}
          />
        </header>

        <main
          id="app-main-content"
          tabIndex={-1}
          className="app-shell-main mx-auto w-full min-w-0 max-w-[1240px] flex-1 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-10 lg:px-8 lg:pt-2"
        >
          {children}
        </main>
        <VoiceHostKeeper restaurantId={current?.organizationId ? current.id : null} />
      </div>
    </div>
  );
}

function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-[19px] font-extrabold leading-none tracking-[-0.04em] text-ink">
      <RoalMark size={26} />
      ROAL
    </span>
  );
}

function NavLink({
  item,
  active,
  compact,
  onNavigate,
}: {
  item: LocationNavItem | DashboardNavItem;
  active: boolean;
  compact: boolean;
  onNavigate: () => void;
}) {
  const iconName = "key" in item ? item.key : navIconKeyForHref(item.href);
  const count = "count" in item ? item.count : undefined;
  return (
    <Link
      href={item.href}
      title={compact ? item.label : item.description}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={compact ? item.label : undefined}
      className={cn(
        "app-shell-nav-link relative flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors lg:min-h-9",
        compact && "lg:justify-center lg:px-0",
        active ? "app-shell-nav-link--active" : "text-muted hover:bg-elev hover:text-ink"
      )}
    >
      <NavIcon name={iconName} className={active ? "text-ink" : "text-subtle"} />
      <span className={cn("min-w-0 flex-1 truncate", compact && "lg:sr-only")}>{item.label}</span>
      {count ? (
        <span
          className={cn("app-shell-nav-count", compact && "lg:absolute lg:right-1 lg:top-0.5")}
          aria-label={`${count} unanswered question${count === 1 ? "" : "s"}`}
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}

function PromoCard({
  current,
  onNavigate,
}: {
  current: ShellLocation | null;
  onNavigate: () => void;
}) {
  if (!current) {
    return (
      <div className="app-promo rounded-xl p-3">
        <p className="text-[13px] font-semibold text-ink">Set up your first location</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted">
          Scan your menu and hear your host take an order in minutes.
        </p>
        <Link href="/dashboard/onboarding" onClick={onNavigate} className="btn-accent btn-sm mt-2.5 w-full">
          Get started
        </Link>
      </div>
    );
  }
  if (!current.isLive) {
    return (
      <div className="app-promo rounded-xl p-3">
        <p className="text-[13px] font-semibold text-ink">Almost ready</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted">
          A few quick steps before {current.agentDisplayName ?? "your host"} starts answering your calls.
        </p>
        <Link
          href={`/dashboard/restaurants/${current.id}/overview#go-live`}
          onClick={onNavigate}
          className="btn-accent btn-sm mt-2.5 w-full"
        >
          See what&apos;s left
        </Link>
      </div>
    );
  }
  const host = current.agentDisplayName ?? "your host";
  return (
    <div className="app-promo rounded-xl p-3">
      <p className="text-[13px] font-semibold text-ink">Hear {host}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-muted">
        Place a test order the way your callers do.
      </p>
      <Link
        href={`/dashboard/restaurants/${current.id}/agent#test-call`}
        onClick={onNavigate}
        className="btn-accent btn-sm mt-2.5 w-full"
      >
        Make a test call
      </Link>
    </div>
  );
}

function AccountCard({
  userEmail,
  userName,
  subtitle,
  roleLabel,
  compact,
  onNavigate,
  showStaffLink = false,
}: {
  userEmail: string;
  userName: string | null;
  subtitle: string | null;
  roleLabel: string | null;
  compact: boolean;
  onNavigate: () => void;
  showStaffLink?: boolean;
}) {
  const { open, toggle, close, rootRef, triggerRef } = usePopover<HTMLDivElement>();
  const go = () => {
    close();
    onNavigate();
  };
  const itemCls =
    "flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px] text-muted hover:bg-elev hover:text-ink lg:min-h-9";

  return (
    <div ref={rootRef} className="app-shell-org relative border-t border-line pt-2.5">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="app-account-menu"
        title={compact ? userEmail : undefined}
        className={cn(
          "app-shell-org__summary flex min-h-11 w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-elev lg:min-h-10",
          compact && "lg:justify-center lg:px-0"
        )}
      >
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[11.5px] font-semibold uppercase text-white"
          aria-hidden
        >
          {initials(userName ?? userEmail)}
        </span>
        <span className={cn("min-w-0 flex-1", compact && "lg:sr-only")}>
          <span className="block truncate text-[13px] font-medium text-ink" title={userEmail}>
            {userEmail}
          </span>
          <span className="block truncate text-[11.5px] text-subtle">{subtitle ?? "Your account"}</span>
        </span>
        <ChevronsUpDown size={15} className={cn("shrink-0 text-subtle", compact && "lg:hidden")} aria-hidden />
      </button>

      {open ? (
        <div
          id="app-account-menu"
          className="app-shell-org__menu app-popover absolute bottom-[calc(100%+6px)] left-0 z-50 w-[15rem] rounded-xl border border-line bg-card p-1.5 shadow-lg"
        >
          <div className="px-2.5 pb-1.5 pt-1">
            <p className="truncate text-[12.5px] font-medium text-ink" title={userEmail}>
              {userEmail}
            </p>
            {roleLabel ? <p className="truncate text-[11.5px] text-subtle">{roleLabel}</p> : null}
          </div>
          <div className="border-t border-line pt-1">
            <Link href="/dashboard/settings" onClick={go} className={itemCls}>
              <Settings size={15} className="text-subtle" aria-hidden /> Settings
            </Link>
            <Link href="/dashboard/support" onClick={go} className={itemCls}>
              <LifeBuoy size={15} className="text-subtle" aria-hidden /> Support
            </Link>
            {showStaffLink ? (
              <Link href="/dashboard/admin" onClick={go} className={itemCls}>
                <Settings size={15} className="text-subtle" aria-hidden /> ROAL staff tools
              </Link>
            ) : null}
            <Link href="/" onClick={go} className={cn("app-shell-marketing-link", itemCls)}>
              <ExternalLink size={15} className="text-subtle" aria-hidden /> Marketing site
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className={cn("app-shell-signout", itemCls)}>
                <LogOut size={15} className="text-subtle" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function initials(value: string): string {
  const parts = value
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (parts.length === 0) return "R";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}
