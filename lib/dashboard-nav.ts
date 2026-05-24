export type DashboardNavItem = {
  href: string;
  label: string;
  description: string;
  badge?: string;
  /** Visible only when user is org owner or admin. */
  adminOnly?: boolean;
};

export type DashboardNavGroup = {
  label: string;
  items: DashboardNavItem[];
};

export const DASHBOARD_NAV: DashboardNavGroup[] = [
  {
    label: "Operations",
    items: [
      {
        href: "/dashboard",
        label: "Overview",
        description: "Workspace summary and quick links",
      },
      {
        href: "/dashboard/restaurants",
        label: "Restaurants",
        description: "Locations, KDS, menu scan, voice agent",
      },
      {
        href: "/dashboard/onboarding",
        label: "Onboarding",
        description: "Setup checklist and go-live steps",
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        href: "/dashboard/analytics",
        label: "Analytics",
        description: "Orders, calls, and menu scan metrics",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/dashboard/settings",
        label: "Settings",
        description: "Organization and restaurant profile",
      },
      {
        href: "/dashboard/settings/notifications",
        label: "Notifications",
        description: "Alerts, webhooks, and dev console log",
      },
      {
        href: "/dashboard/billing",
        label: "Billing",
        description: "Plan, usage, and invoices",
      },
      {
        href: "/dashboard/support",
        label: "Support",
        description: "Help, status, and contact",
      },
    ],
  },
  {
    label: "Internal",
    items: [
      {
        href: "/dashboard/admin",
        label: "Admin / Ops",
        description: "Support tools and tenant health",
        badge: "Staff",
        adminOnly: true,
      },
    ],
  },
];

export const DASHBOARD_NAV_HREFS = DASHBOARD_NAV.flatMap((g) => g.items.map((i) => i.href));

const ALL_NAV_HREFS = DASHBOARD_NAV_HREFS;

/** Longest matching nav href wins (e.g. Notifications over Settings). */
export function isDashboardNavActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";

  const matches = ALL_NAV_HREFS.filter(
    (h) => pathname === h || pathname.startsWith(`${h}/`)
  );
  if (matches.length === 0) return false;

  const best = matches.reduce((a, b) => (b.length > a.length ? b : a));
  return best === href;
}
