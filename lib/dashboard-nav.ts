/**
 * App shell navigation (v3). The sidebar is scoped to the CURRENT location;
 * org-level pages live in a small "Organization" group for owners/managers.
 */

/* ------------------------------------------------------------------ */
/* Location modules                                                    */
/* ------------------------------------------------------------------ */

export type LocationNavKey =
  | "overview"
  | "calls"
  | "kitchen"
  | "menu"
  | "host"
  | "reports"
  | "billing"
  | "settings";

export type LocationNavItem = {
  key: LocationNavKey;
  href: string;
  label: string;
  description: string;
  /** Count badge (e.g. unanswered caller questions on Phone host). */
  count?: number;
};

export function restaurantBasePath(restaurantId: string): string {
  return `/dashboard/restaurants/${restaurantId}`;
}

export function restaurantOverviewHref(restaurantId: string): string {
  return `${restaurantBasePath(restaurantId)}/overview`;
}

export function buildLocationNav(
  restaurantId: string,
  options: { pendingQuestions?: number } = {}
): LocationNavItem[] {
  const base = restaurantBasePath(restaurantId);
  return [
    { key: "overview", href: `${base}/overview`, label: "Overview", description: "Your month at a glance" },
    { key: "calls", href: `${base}/calls`, label: "Calls & Orders", description: "Every call, transcript and order" },
    { key: "kitchen", href: base, label: "Kitchen", description: "Live ticket board for the kitchen tablet" },
    { key: "menu", href: `${base}/menu`, label: "Menu", description: "Menu items, prices and photos" },
    {
      key: "host",
      href: `${base}/agent`,
      label: "Phone host",
      description: "Test call, voice and unanswered questions",
      count: options.pendingQuestions && options.pendingQuestions > 0 ? options.pendingQuestions : undefined,
    },
    { key: "reports", href: `${base}/analytics`, label: "Reports", description: "Calls, orders, revenue and peak hours" },
    { key: "billing", href: `${base}/billing`, label: "Billing", description: "Completed orders and invoices" },
    {
      key: "settings",
      href: `${base}/settings`,
      label: "Settings",
      description: "Business info, hours, FAQs and handoff",
    },
  ];
}

/** `/dashboard/restaurants/{id}/...` → id (null on the list page or org routes). */
export function restaurantIdFromPath(pathname: string | null | undefined): string | null {
  const match = /^\/dashboard\/restaurants\/([^/?#]+)/.exec(pathname ?? "");
  if (!match) return null;
  const id = decodeURIComponent(match[1]);
  return id && id !== "new" ? id : null;
}

/** Path after `/dashboard/restaurants/{id}` ("" for the kitchen board). */
export function restaurantSubpath(pathname: string, restaurantId: string): string {
  const base = restaurantBasePath(restaurantId);
  if (!pathname.startsWith(base)) return "";
  return pathname.slice(base.length).replace(/\/$/, "");
}

/** Where to go when switching location: same module on the new location, else its overview. */
export function switchLocationHref(pathname: string, fromId: string | null, toId: string): string {
  if (fromId && restaurantIdFromPath(pathname) === fromId) {
    const sub = restaurantSubpath(pathname, fromId);
    return `${restaurantBasePath(toId)}${sub}`;
  }
  return restaurantOverviewHref(toId);
}

export function isLocationNavActive(
  key: LocationNavKey,
  pathname: string,
  restaurantId: string,
  hash = ""
): boolean {
  if (restaurantIdFromPath(pathname) !== restaurantId) return false;
  const sub = restaurantSubpath(pathname, restaurantId);
  const onSettings = sub.startsWith("/settings");
  switch (key) {
    case "overview":
      return sub.startsWith("/overview");
    case "calls":
      return sub.startsWith("/calls");
    case "kitchen":
      return sub === "";
    case "menu":
      return sub.startsWith("/menu") && !onSettings;
    case "host":
      return sub.startsWith("/agent");
    case "reports":
      return sub.startsWith("/analytics");
    case "billing":
      return sub.startsWith("/billing");
    case "settings":
      return onSettings || sub.startsWith("/settings");
    default:
      return false;
  }
}

/* ------------------------------------------------------------------ */
/* Organization group                                                  */
/* ------------------------------------------------------------------ */

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

export const DASHBOARD_NAV: DashboardNavGroup[] = [
  {
    label: "Organization",
    items: [
      {
        href: "/dashboard/restaurants",
        label: "All locations",
        description: "Every location and its live status",
        orgAdminOnly: true,
      },
      {
        href: "/dashboard/overview",
        label: "Organization overview",
        description: "Calls and orders across all locations",
        orgAdminOnly: true,
      },
      {
        href: "/dashboard/settings",
        label: "Team & settings",
        description: "Organization, team and alerts",
        orgAdminOnly: true,
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

export const SUPPORT_NAV_ITEM: DashboardNavItem = {
  href: "/dashboard/support",
  label: "Support",
  description: "Help and contact",
};

export function visibleOrgNav(options: {
  showAdminNav: boolean;
  showOrgAdminNav: boolean;
}): DashboardNavGroup[] {
  return DASHBOARD_NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        (!item.platformOnly || options.showAdminNav) &&
        (!item.orgAdminOnly || options.showOrgAdminNav)
    ),
  })).filter((group) => group.items.length > 0);
}

/** Org-level hrefs: exact match, or nested route (settings/notifications). */
export function isDashboardNavActive(href: string, pathname: string): boolean {
  if (href === "/dashboard/restaurants") {
    return pathname === "/dashboard/restaurants";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ------------------------------------------------------------------ */
/* Last-used location                                                  */
/* ------------------------------------------------------------------ */

export const LAST_RESTAURANT_COOKIE = "roal_last_restaurant";
export const SIDEBAR_COLLAPSED_KEY = "roal_sidebar_collapsed";

/** Path id → remembered id (if still accessible) → first location. */
export function resolveCurrentRestaurantId(input: {
  pathname: string | null | undefined;
  remembered: string | null | undefined;
  restaurantIds: string[];
}): string | null {
  const fromPath = restaurantIdFromPath(input.pathname);
  // The page enforces access; trust the URL so the sidebar matches the page.
  if (fromPath) return fromPath;
  if (input.remembered && input.restaurantIds.includes(input.remembered)) return input.remembered;
  return input.restaurantIds[0] ?? null;
}
