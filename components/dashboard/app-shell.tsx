"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { RoalMark } from "@/components/landing/roal-mark";
import { cn } from "@/lib/cn";
import {
  DASHBOARD_NAV,
  isDashboardNavActive,
  type DashboardNavItem,
} from "@/lib/dashboard-nav";
import { NavIcon } from "./nav-icon";

export function AppShell({
  children,
  userEmail,
  organizationName,
  roleLabel,
  showAdminNav,
}: {
  children: ReactNode;
  userEmail: string;
  organizationName: string | null;
  roleLabel: string | null;
  showAdminNav: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navGroups = DASHBOARD_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || showAdminNav),
  })).filter((group) => group.items.length > 0);

  const showLiveBadge = pathname.startsWith("/dashboard/restaurants/");

  return (
    <div className="flex min-h-[100dvh] min-w-0 bg-base">
      <a href="#app-main-content" className="app-shell-skip">
        Skip to content
      </a>
      <aside
        id="app-sidebar"
        className={cn(
          "app-shell-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,16rem)] flex-col border-r border-line bg-card pt-[env(safe-area-inset-top)] transition-transform duration-200 lg:static lg:z-auto lg:w-56 lg:translate-x-0 lg:shrink-0 lg:shadow-none",
          mobileOpen ? "app-shell-sidebar--open translate-x-0" : "-translate-x-full"
        )}
        aria-label="App navigation"
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2"
            onClick={() => setMobileOpen(false)}
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-elev">
              <RoalMark />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">ROAL</p>
              <p className="truncate text-[10px] uppercase tracking-[0.14em] text-subtle">
                Restaurant OS
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              <p className="px-2 pb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      item={item}
                      active={isDashboardNavActive(item.href, pathname)}
                      onNavigate={() => setMobileOpen(false)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
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
              <p className="truncate text-[11px] font-medium text-ink">
                {organizationName ?? "No organization"}
              </p>
              <p className="truncate text-[10px] text-subtle" title={userEmail}>
                {userEmail}
                {roleLabel ? ` · ${roleLabel}` : ""}
              </p>
            </div>
          </div>
          <form action="/auth/signout" method="post" className="mt-2">
            <button
              type="submit"
              className="min-h-9 w-full rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-muted hover:bg-elev hover:text-ink"
            >
              Sign out
            </button>
          </form>
          <Link
            href="/"
            className="mt-1 block truncate rounded-md px-2 py-1.5 text-[11px] text-muted hover:bg-elev hover:text-ink"
            onClick={() => setMobileOpen(false)}
          >
            Back to marketing site
          </Link>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px] lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className="flex min-w-0 flex-1 flex-col"
        {...(mobileOpen ? { inert: true as const } : {})}
      >
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-line/90 bg-base/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:px-6">
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="app-sidebar"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileOpen((o) => !o)}
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
            <p className="truncate text-sm font-semibold text-ink">
              {pageTitle(pathname)}
            </p>
            <p className="truncate text-xs text-subtle">{pageSubtitle(pathname)}</p>
          </div>
          {showLiveBadge ? (
            <div className="app-shell-header-badge hidden sm:inline-flex" title="Kitchen display and phone orders update in real time">
              <span className="pulse-dot" />
              Realtime
            </div>
          ) : null}
        </header>

        <main
          id="app-main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-8 sm:pt-8"
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
        "flex min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
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
  if (pathname === "/dashboard") return "Overview";
  if (pathname.startsWith("/dashboard/restaurants/")) return "Restaurant workspace";
  for (const group of DASHBOARD_NAV) {
    for (const item of group.items) {
      if (isDashboardNavActive(item.href, pathname) && item.href !== "/dashboard/restaurants") {
        return item.label;
      }
    }
  }
  if (pathname.startsWith("/dashboard/restaurants")) return "Restaurants";
  return "Dashboard";
}

function pageSubtitle(pathname: string): string {
  if (pathname.startsWith("/dashboard/restaurants/")) {
    return "KDS · menu · phone orders";
  }
  for (const group of DASHBOARD_NAV) {
    for (const item of group.items) {
      if (isDashboardNavActive(item.href, pathname)) {
        return item.description;
      }
    }
  }
  return "Restaurant operating system";
}
