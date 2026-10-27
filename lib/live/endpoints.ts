/** Client-safe URLs for the live polling endpoints (app/api/restaurants/**). */
export const liveEndpoints = {
  orders: (restaurantId: string) =>
    `/api/restaurants/${encodeURIComponent(restaurantId)}/live/orders`,
  menu: (restaurantId: string) =>
    `/api/restaurants/${encodeURIComponent(restaurantId)}/live/menu`,
  callStatus: (restaurantId: string) =>
    `/api/restaurants/${encodeURIComponent(restaurantId)}/live/call-status`,
  locations: () => `/api/restaurants/locations`,
} as const;
