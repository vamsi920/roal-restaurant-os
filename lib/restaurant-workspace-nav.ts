import { RESTAURANT_LIVE_ORDERS_LABEL, RESTAURANT_MENU_AGENT_LABEL } from "@/lib/dashboard-restaurant-labels";

export type RestaurantWorkspaceDestinationId =
  | "orders"
  | "menu"
  | "liveAgent"
  | "calls"
  | "analytics"
  | "billing"
  | "settings";

export const RESTAURANT_CALLS_FOLLOWUPS_LABEL = "Calls / Follow-ups";

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
 * Routes are generated from the current restaurant id and feature flags.
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
      label: "Live Agent",
    },
    {
      id: "calls",
      href: `${base}/calls`,
      label: RESTAURANT_CALLS_FOLLOWUPS_LABEL,
    },
    {
      id: "analytics",
      href: analyticsHref,
      label: "Analytics",
    },
    {
      id: "billing",
      href: billingHref,
      label: "Billing",
    },
    {
      id: "settings",
      href: `${base}/menu#restaurant-settings`,
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
      return "Orders";
    case "menu":
      return "Menu";
    case "liveAgent":
      return "Agent";
    case "calls":
      return "Calls";
    case "analytics":
      return "Stats";
    case "billing":
      return "Plan";
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

