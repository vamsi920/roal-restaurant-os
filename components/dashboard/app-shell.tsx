"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";
import { RoalMark } from "@/components/landing/roal-mark";
import { cn } from "@/lib/cn";
import {
  DASHBOARD_NAV,
  dashboardPageMeta,
  isDashboardNavActive,
  type DashboardNavItem,
} from "@/lib/dashboard-nav";
import { restaurantWorkspaceMobileTitle } from "@/lib/dashboard-restaurant-labels";
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

  const meta = useMemo(() => dashboardPageMeta(pathname), [pathname]);
  const inWorkspace = Boolean(restaurantWorkspaceMobileTitle(pathname));

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
        className={cn(
          "app-shell-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,16rem)] flex-col border-r border-line bg-card pt-[env(safe-area-inset-top)] transition-transform duration-200 lg:static lg:z-auto lg:w-[220px] lg:translate-x-0 lg:shrink-0",
          mobileOpen ? "app-shell-sidebar--open translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-12 items-center border-b border-line px-3">
          <Link
            href="/dashboard/restaurants"
            className="flex min-h-11 min-w-0 items-center gap-2 rounded-md px-1 lg:min-h-9"
            onClick={closeMenu}
          >
            <span className="grid h-6 w-6 place-items-center rounded-md border border-line bg-elev">
              <RoalMark className="h-3.5 w-3.5" />
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
              ROAL
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-3" aria-label="Sections">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-3 last:mb-0">
              <p className="app-shell-nav-group-label px-2 pb-1">{group.label}</p>
              <ul className="space-y-px">
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
          {showOrgAdminNav ? (
            <div className="mt-3 border-t border-line pt-3">
              <Link
                href="/dashboard/onboarding?new=1"
                onClick={closeMenu}
                className="app-shell-nav-link flex min-h-11 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-muted hover:bg-elev hover:text-ink lg:min-h-8"
              >
                <span className="grid h-4 w-4 place-items-center text-subtle" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                Add location
              </Link>
            </div>
          ) : null}
        </nav>

        <div className="app-shell-sidebar__footer border-t border-line p-2">
          <details className="app-shell-org group">
            <summary className="app-shell-org__summary flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 hover:bg-elev lg:min-h-10 [&::-webkit-details-marker]:hidden">
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ink text-[11px] font-semibold uppercase text-base"
                aria-hidden
              >
                {initials(organizationName ?? userEmail)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">
                  {organizationName ?? "No organization"}
                </span>
                <span className="block truncate text-[11px] text-subtle" title={userEmail}>
                  {roleLabel ?? userEmail}
                </span>
              </span>
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 shrink-0 text-subtle transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <div className="app-shell-org__menu mt-1 rounded-md border border-line bg-card p-1 shadow-md">
              <p className="truncate px-2 py-1.5 text-[11px] text-subtle" title={userEmail}>
                {userEmail}
              </p>
              <Link
                href="/dashboard/settings"
                onClick={closeMenu}
                className="flex min-h-11 items-center rounded px-2 text-[13px] text-muted hover:bg-elev hover:text-ink lg:min-h-8"
              >
                Settings
              </Link>
              <Link
                href="/dashboard/support"
                onClick={closeMenu}
                className="flex min-h-11 items-center rounded px-2 text-[13px] text-muted hover:bg-elev hover:text-ink lg:min-h-8"
              >
                Support
              </Link>
              <Link
                href="/"
                onClick={closeMenu}
                className="app-shell-marketing-link flex min-h-11 items-center rounded px-2 text-[13px] text-muted hover:bg-elev hover:text-ink lg:min-h-8"
              >
                Marketing site
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="app-shell-signout flex min-h-11 w-full items-center rounded px-2 text-left text-[13px] text-muted hover:bg-elev hover:text-ink lg:min-h-8"
                >
                  Sign out
                </button>
              </form>
            </div>
          </details>
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
        <header className="app-shell-header sticky top-0 z-30 flex h-12 min-h-12 items-center gap-2 border-b border-line bg-base/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:px-5">
          <button
            ref={menuButtonRef}
            type="button"
            className="app-shell-menu-btn -ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink hover:bg-elev lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="app-sidebar"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={toggleMenu}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              {mobileOpen ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">
              {meta.title}
            </h1>
            {meta.subtitle && !inWorkspace ? (
              <p className="hidden truncate text-[13px] text-subtle md:block">{meta.subtitle}</p>
            ) : null}
          </div>
          {meta.action ? (
            <Link href={meta.action.href} className="btn-primary btn-sm shrink-0">
              {meta.action.label}
            </Link>
          ) : null}
        </header>

        <main
          id="app-main-content"
          tabIndex={-1}
          className="app-shell-main mx-auto w-full min-w-0 max-w-[1280px] flex-1 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-10 sm:pt-6"
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
        "app-shell-nav-link flex min-h-11 min-w-0 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors lg:min-h-8",
        active ? "app-shell-nav-link--active" : "text-muted hover:bg-elev hover:text-ink"
      )}
    >
      <NavIcon href={item.href} className={active ? "text-ink" : "text-subtle"} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="chip shrink-0 px-1.5 py-0 text-[9px]">{item.badge}</span>
      ) : null}
    </Link>
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
