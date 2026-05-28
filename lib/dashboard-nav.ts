import { RESTAURANT_LIST_NAV_LABEL } from "@/lib/dashboard-restaurant-labels";

export type DashboardNavItem = {
  href: string;
  label: string;
  description: string;
  badge?: string;
  /** Visible only to ROAL platform support (not org owner/admin role). */
  platformOnly?: boolean;
};

export type DashboardNavGroup = {
  label: string;
  items: DashboardNavItem[];
};

/** Sidebar nav — location picker + org account; per-location ops live in workspace rail. */
export const DASHBOARD_NAV: DashboardNavGroup[] = [
  {
    label: "Work",
    items: [
      {
        href: "/dashboard/restaurants",
        label: RESTAURANT_LIST_NAV_LABEL,
        description: "Select a location, then use its workspace tabs",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/dashboard/settings",
        label: "Settings",
        description: "Profile, alerts, and organization",
      },
    ],
  },
  {
    label: "Internal",
    items: [
      {
        href: "/dashboard/admin",
        label: "Platform",
        description: "Tenant health (ROAL staff)",
        platformOnly: true,
      },
    ],
  },
];

export const DASHBOARD_NAV_HREFS = DASHBOARD_NAV.flatMap((g) => g.items.map((i) => i.href));

/** Longest matching nav href wins (e.g. notifications under settings, not Settings). */
export function isDashboardNavActive(href: string, pathname: string): boolean {
  if (href === "/dashboard/restaurants") {
    return (
      pathname === "/dashboard/restaurants" ||
      pathname.startsWith("/dashboard/restaurants/")
    );
  }

  const matches = DASHBOARD_NAV_HREFS.filter(
    (h) => pathname === h || pathname.startsWith(`${h}/`)
  );
  if (matches.length === 0) return false;

  const best = matches.reduce((a, b) => (b.length > a.length ? b : a));
  return best === href;
}
