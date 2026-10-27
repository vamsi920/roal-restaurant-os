import type { ReactNode } from "react";

type Props = {
  restaurantId: string;
  restaurantName: string;
  hasRestaurantAnalytics?: boolean;
  hasRestaurantBilling?: boolean;
  /** Pending "couldn't answer" suggestions; the app sidebar shows this badge now. */
  suggestionCount?: number;
  children: ReactNode;
};

/**
 * Former per-location rail. Navigation moved to the location-scoped app
 * sidebar (components/dashboard/app-shell.tsx); this stays as a passthrough so
 * existing pages keep their imports and props.
 */
export function RestaurantWorkspaceRail({ children }: Props) {
  return <>{children}</>;
}
