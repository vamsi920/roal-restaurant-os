import {
  RESTAURANT_LIST_NAV_LABEL,
  restaurantWorkspaceMobileSubtitle,
  restaurantWorkspaceMobileTitle,
} from "@/lib/dashboard-restaurant-labels";

export type DashboardNavItem = {
  href: string;
  label: string;
  description: string;
  badge?: string;
  /** Visible only to ROAL platform support (not org owner/admin role). */
  platformOnly?: boolean;
  /** Visible only to organization owner or manager (admin role). */
  orgAdminOnly?: boolean;
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
        href: "/dashboard/overview",
        label: "Overview",
        description: "All locations, phone hosts, and live orders",
        orgAdminOnly: true,
      },
      {
        href: "/dashboard/restaurants",
        label: RESTAURANT_LIST_NAV_LABEL,
        description: "Pick a location to open its workspace",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/dashboard/settings",
        label: "Settings",
        description: "Organization, alerts, and billing",
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
  if (href === "/dashboard/overview") {
    return pathname === "/dashboard/overview";
  }

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

export type DashboardTopBarAction = { label: string; href: string };

export type DashboardPageMeta = {
  title: string;
  subtitle: string | null;
  action: DashboardTopBarAction | null;
};

const ADD_LOCATION: DashboardTopBarAction = {
  label: "Add location",
  href: "/dashboard/onboarding?new=1",
};

/** Title, subtitle and the single primary action shown in the 48px top bar. */
export function dashboardPageMeta(pathname: string): DashboardPageMeta {
  const workspaceTitle = restaurantWorkspaceMobileTitle(pathname);
  if (workspaceTitle) {
    return {
      title: workspaceTitle,
      subtitle: restaurantWorkspaceMobileSubtitle(pathname),
      action: null,
    };
  }

  if (pathname === "/dashboard/onboarding") {
    return { title: "Go live", subtitle: "Finish setup for this location", action: null };
  }
  if (pathname === "/dashboard/settings/notifications") {
    return { title: "Notifications", subtitle: "Alerts and delivery history", action: null };
  }
  if (pathname === "/dashboard/billing") {
    return { title: "Billing", subtitle: "Plan and usage", action: null };
  }
  if (pathname === "/dashboard/analytics") {
    return { title: "Analytics", subtitle: "Calls and orders across locations", action: null };
  }
  if (pathname === "/dashboard/support") {
    return { title: "Support", subtitle: "Runbooks and contact", action: null };
  }
  if (pathname === "/dashboard/overview") {
    return { title: "Overview", subtitle: "All locations", action: ADD_LOCATION };
  }
  if (pathname === "/dashboard/restaurants" || pathname.startsWith("/dashboard/restaurants/")) {
    return { title: RESTAURANT_LIST_NAV_LABEL, subtitle: null, action: ADD_LOCATION };
  }

  for (const group of DASHBOARD_NAV) {
    for (const item of group.items) {
      if (isDashboardNavActive(item.href, pathname)) {
        return { title: item.label, subtitle: item.description, action: null };
      }
    }
  }

  return { title: "Dashboard", subtitle: null, action: null };
}
