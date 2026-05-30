"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { RoalMark } from "@/components/landing/roal-mark";
import { cn } from "@/lib/cn";
import {
  DASHBOARD_NAV,
  isDashboardNavActive,
  type DashboardNavItem,
} from "@/lib/dashboard-nav";
import {
  restaurantWorkspaceMobileSubtitle,
  restaurantWorkspaceMobileTitle,
} from "@/lib/dashboard-restaurant-labels";
import { useAppShellNav } from "@/lib/dashboard/use-app-shell-nav";
import { NavIcon } from "./nav-icon";

export function AppShell({
  children,
  userEmail,
  organizationName,
  roleLabel,
  showAdminNav,
  showOrgAdminNav = false,
}: {
  children: ReactNode;
  userEmail: string;
  organizationName: string | null;
  roleLabel: string | null;
  showAdminNav: boolean;
  showOrgAdminNav?: boolean;
}) {
  const pathname = usePathname();
  const {
    mobileOpen,
    closeMenu,
    toggleMenu,
    menuButtonRef,
    sidebarRef,
    onBackdropClose,
  } = useAppShellNav();

  const navGroups = DASHBOARD_NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        (!item.platformOnly || showAdminNav) &&
        (!item.orgAdminOnly || showOrgAdminNav)
    ),
  })).filter((group) => group.items.length > 0);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

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
        className={cn(
          "app-shell-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,16rem)] flex-col border-r border-line bg-card pt-[env(safe-area-inset-top)] transition-transform duration-200 lg:static lg:z-auto lg:w-56 lg:translate-x-0 lg:shrink-0 lg:shadow-none",
          mobileOpen ? "app-shell-sidebar--open translate-x-0" : "-translate-x-full"
        )}
        aria-label="App navigation"
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
          <Link
            href="/dashboard/restaurants"
            className="flex min-h-11 min-w-0 items-center gap-2"
            onClick={closeMenu}
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-elev">
              <RoalMark />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-ink">ROAL</p>
              <p className="truncate text-xs text-subtle">Pickup ops</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              <p className="app-shell-nav-group-label px-2.5 pb-1.5">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      item={item}
                      active={isDashboardNavActive(item.href, pathname)}
                      onNavigate={closeMenu}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="app-shell-sidebar__footer border-t border-line p-3">
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-elev px-2.5 py-2">
            <Image
              src="/icons/roal-user-icon.svg"
              alt=""
              aria-hidden="true"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-lg"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">
                {organizationName ?? "No organization"}
              </p>
              <p className="truncate text-xs text-subtle" title={userEmail}>
                {userEmail}
                {roleLabel ? ` · ${roleLabel}` : ""}
              </p>
            </div>
          </div>
          <form action="/auth/signout" method="post" className="mt-2">
            <button
              type="submit"
              className="app-shell-signout min-h-11 w-full rounded-md px-2.5 py-2 text-left text-sm font-medium text-muted hover:bg-elev hover:text-ink"
            >
              Sign out
            </button>
          </form>
          <Link
            href="/"
            className="app-shell-marketing-link mt-1 block min-w-0 truncate rounded-md px-2.5 py-2 text-sm text-muted hover:bg-elev hover:text-ink"
            onClick={closeMenu}
          >
            Back to marketing site
          </Link>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="app-shell-backdrop fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px] lg:hidden"
          aria-label="Close navigation"
          onClick={onBackdropClose}
        />
      ) : null}

      <div
        className="app-shell-content flex min-w-0 flex-1 flex-col"
        {...(mobileOpen ? { inert: true as const } : {})}
      >
        <header className="app-shell-header sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-line/90 bg-base/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:px-6">
          <button
            ref={menuButtonRef}
            type="button"
            className="app-shell-menu-btn inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="app-sidebar"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={toggleMenu}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {mobileOpen ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-ink">
              {pageTitle(pathname)}
            </p>
            <p className="truncate text-sm text-subtle">{pageSubtitle(pathname)}</p>
          </div>
        </header>

        <main
          id="app-main-content"
          tabIndex={-1}
          className="app-shell-main mx-auto w-full max-w-[1600px] min-w-0 flex-1 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-8 sm:pt-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: DashboardNavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      title={item.description}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "app-shell-nav-link flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "app-shell-nav-link--active"
          : "text-muted hover:bg-elev hover:text-ink"
      )}
    >
      <NavIcon href={item.href} className={active ? "text-accent" : "text-subtle"} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="shrink-0 rounded bg-elev px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-subtle">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function pageTitle(pathname: string): string {
  const workspaceTitle = restaurantWorkspaceMobileTitle(pathname);
  if (workspaceTitle) return workspaceTitle;
  for (const group of DASHBOARD_NAV) {
    for (const item of group.items) {
      if (isDashboardNavActive(item.href, pathname) && item.href !== "/dashboard/restaurants") {
        return item.label;
      }
    }
  }
  if (pathname.startsWith("/dashboard/restaurants")) return "Locations";
  if (pathname === "/dashboard") return "Locations";
  return "Dashboard";
}

function pageSubtitle(pathname: string): string {
  const workspaceSubtitle = restaurantWorkspaceMobileSubtitle(pathname);
  if (workspaceSubtitle) return workspaceSubtitle;
  for (const group of DASHBOARD_NAV) {
    for (const item of group.items) {
      if (isDashboardNavActive(item.href, pathname)) {
        return item.description;
      }
    }
  }
  return "Pickup phone orders and kitchen display";
}
