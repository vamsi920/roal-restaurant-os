/** Display labels for restaurant workspace routes (URLs unchanged). */

export const RESTAURANT_LIST_NAV_LABEL = "Locations";

export const RESTAURANT_LIVE_ORDERS_LABEL = "Live orders";

/** @deprecated Prefer RESTAURANT_LIVE_ORDERS_LABEL for owner-facing copy. */
export const RESTAURANT_KDS_LABEL = RESTAURANT_LIVE_ORDERS_LABEL;

export const RESTAURANT_MENU_AGENT_LABEL = "Menu";

export const RESTAURANT_MENU_SETUP_TITLE = "Menu setup";

/** Owner-facing menu workspace title (builder + sync). */
export const RESTAURANT_MENU_BUILDER_TITLE = "Menu builder";

const KDS_PATH = /^\/dashboard\/restaurants\/[^/]+\/?$/;
const MENU_AGENT_PATH = /^\/dashboard\/restaurants\/[^/]+\/menu\/?$/;
const LIVE_AGENT_PATH = /^\/dashboard\/restaurants\/[^/]+\/agent\/?$/;
const RESTAURANT_ANALYTICS_PATH = /^\/dashboard\/restaurants\/[^/]+\/analytics\/?$/;
const RESTAURANT_BILLING_PATH = /^\/dashboard\/restaurants\/[^/]+\/billing\/?$/;

/** Any selected-location workspace route (orders, menu, agent, analytics, billing). */
export function isRestaurantWorkspacePath(pathname: string): boolean {
  return (
    KDS_PATH.test(pathname) ||
    MENU_AGENT_PATH.test(pathname) ||
    LIVE_AGENT_PATH.test(pathname) ||
    RESTAURANT_ANALYTICS_PATH.test(pathname) ||
    RESTAURANT_BILLING_PATH.test(pathname)
  );
}

export function isRestaurantKdsPath(pathname: string): boolean {
  return KDS_PATH.test(pathname);
}

export function isRestaurantMenuAgentPath(pathname: string): boolean {
  return MENU_AGENT_PATH.test(pathname);
}

/** Mobile shell title for restaurant detail or menu routes. */
export function restaurantWorkspaceMobileTitle(pathname: string): string | null {
  if (LIVE_AGENT_PATH.test(pathname)) return "Live Agent";
  if (RESTAURANT_ANALYTICS_PATH.test(pathname)) return "Analytics";
  if (RESTAURANT_BILLING_PATH.test(pathname)) return "Billing";
  if (isRestaurantMenuAgentPath(pathname)) return RESTAURANT_MENU_SETUP_TITLE;
  if (isRestaurantKdsPath(pathname)) return RESTAURANT_LIVE_ORDERS_LABEL;
  return null;
}

/** Mobile shell subtitle for restaurant detail or menu routes. */
export function restaurantWorkspaceMobileSubtitle(pathname: string): string | null {
  if (LIVE_AGENT_PATH.test(pathname)) {
    return "Voice agent for this location";
  }
  if (RESTAURANT_ANALYTICS_PATH.test(pathname)) {
    return "Calls and orders for this location";
  }
  if (RESTAURANT_BILLING_PATH.test(pathname)) {
    return "Plan and location usage";
  }
  if (isRestaurantMenuAgentPath(pathname)) {
    return "Menu upload and live menu";
  }
  if (isRestaurantKdsPath(pathname)) {
    return "Live phone orders";
  }
  return null;
}
