import { RESTAURANT_LIVE_ORDERS_LABEL, RESTAURANT_MENU_AGENT_LABEL } from "@/lib/dashboard-restaurant-labels";

export type RestaurantWorkspaceDestinationId =
  | "orders"
  | "menu"
  | "liveAgent"
  | "calls"
  | "analytics"
  | "billing"
  | "settings";

export const RESTAURANT_CALLS_FOLLOWUPS_LABEL = "Calls & Orders";

/** Owner-facing name for the per-location voice agent surface. */
export const RESTAURANT_PHONE_HOST_LABEL = "Phone host";

export type RestaurantWorkspaceDestination = {
  id: RestaurantWorkspaceDestinationId;
  href: string;
  label: string;
};

export type RestaurantWorkspaceNavOptions = {
  restaurantId: string;
  hasLiveAgentRoute?: boolean;
  hasRestaurantAnalytics?: boolean;
  hasRestaurantBilling?: boolean;
};

/**
 * Selected-location workspace navigation model.
 * Order mirrors the owner's day: calls & orders, the kitchen board, menu, the host, reports, billing, settings.
 */
export function buildRestaurantWorkspaceNav(
  options: RestaurantWorkspaceNavOptions
): RestaurantWorkspaceDestination[] {
  const {
    restaurantId,
    hasLiveAgentRoute = false,
    hasRestaurantAnalytics = false,
    hasRestaurantBilling = false,
  } = options;

  const base = `/dashboard/restaurants/${restaurantId}`;

  const liveAgentHref = hasLiveAgentRoute
    ? `${base}/agent`
    : `${base}/menu`;

  const analyticsHref = hasRestaurantAnalytics
    ? `${base}/analytics`
    : `/dashboard/analytics`;

  const billingHref = hasRestaurantBilling
    ? `${base}/billing`
    : `/dashboard/billing`;

  const destinations: RestaurantWorkspaceDestination[] = [
    {
      id: "calls",
      href: `${base}/calls`,
      label: RESTAURANT_CALLS_FOLLOWUPS_LABEL,
    },
    {
      id: "orders",
      href: base,
      label: RESTAURANT_LIVE_ORDERS_LABEL,
    },
    {
      id: "menu",
      href: `${base}/menu`,
      label: RESTAURANT_MENU_AGENT_LABEL,
    },
    {
      id: "liveAgent",
      href: liveAgentHref,
      label: RESTAURANT_PHONE_HOST_LABEL,
    },
    {
      id: "analytics",
      href: analyticsHref,
      label: "Reports",
    },
    {
      id: "billing",
      href: billingHref,
      label: "Billing",
    },
    {
      id: "settings",
      href: `${base}/settings`,
      label: "Settings",
    },
  ];

  return destinations;
}

/** Short labels for the mobile bottom rail; full labels stay in `aria-label`. */
export function restaurantWorkspaceMobileNavLabel(
  id: RestaurantWorkspaceDestinationId
): string {
  switch (id) {
    case "orders":
      return "Kitchen";
    case "menu":
      return "Menu";
    case "liveAgent":
      return "Host";
    case "calls":
      return "Calls";
    case "analytics":
      return "Reports";
    case "billing":
      return "Billing";
    case "settings":
      return "Settings";
    default:
      return id;
  }
}

export function isRestaurantWorkspaceNavActive(
  itemId: RestaurantWorkspaceDestinationId,
  pathname: string,
  restaurantId: string
): boolean {
  const base = `/dashboard/restaurants/${restaurantId}`;
  const menuPath = `${base}/menu`;
  const liveAgentPath = `${base}/agent`;
  const callsPath = `${base}/calls`;
  const analyticsPath = `${base}/analytics`;
  const billingPath = `${base}/billing`;
  const settingsPath = `${base}/menu`;

  switch (itemId) {
    case "orders":
      return pathname === base;
    case "menu":
      return pathname.startsWith(menuPath);
    case "liveAgent":
      return pathname.startsWith(liveAgentPath);
    case "calls":
      return pathname.startsWith(callsPath);
    case "analytics":
      return (
        pathname.startsWith(analyticsPath) || pathname.startsWith("/dashboard/analytics")
      );
    case "billing":
      return (
        pathname.startsWith(billingPath) || pathname.startsWith("/dashboard/billing")
      );
    case "settings":
      return pathname.startsWith(settingsPath);
    default:
      return false;
  }
}
