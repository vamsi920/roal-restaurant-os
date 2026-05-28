import { RESTAURANT_LIVE_ORDERS_LABEL, RESTAURANT_MENU_AGENT_LABEL } from "@/lib/dashboard-restaurant-labels";

export type RestaurantWorkspaceDestinationId =
  | "orders"
  | "menu"
  | "liveAgent"
  | "analytics"
  | "billing";

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
      id: "analytics",
      href: analyticsHref,
      label: "Analytics",
    },
    {
      id: "billing",
      href: billingHref,
      label: "Billing",
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
    case "analytics":
      return "Stats";
    case "billing":
      return "Plan";
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
  const analyticsPath = `${base}/analytics`;
  const billingPath = `${base}/billing`;

  switch (itemId) {
    case "orders":
      return pathname === base;
    case "menu":
      return pathname.startsWith(menuPath);
    case "liveAgent":
      return pathname.startsWith(liveAgentPath);
    case "analytics":
      return (
        pathname.startsWith(analyticsPath) || pathname.startsWith("/dashboard/analytics")
      );
    case "billing":
      return (
        pathname.startsWith(billingPath) || pathname.startsWith("/dashboard/billing")
      );
    default:
      return false;
  }
}

