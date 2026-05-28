/** Short enterprise trust chips (homepage product section). */

export type HomeTrustPoint = {
  id: string;
  title: string;
  body: string;
  href?: string;
};

export const HOME_TRUST_POINTS: HomeTrustPoint[] = [
  {
    id: "secure-menu",
    title: "Secure menu data",
    body: "Menu and orders stay in your account.",
    href: "/security",
  },
  {
    id: "handoff",
    title: "Human handoff",
    body: "Staff can take any call.",
  },
  {
    id: "kds-ticket",
    title: "Live kitchen ticket",
    body: "Confirmed orders hit your kitchen screen live.",
  },
  {
    id: "billing",
    title: "No per-minute fees",
    body: "If it does not become an order, you do not pay.",
    href: "/pricing",
  },
];
