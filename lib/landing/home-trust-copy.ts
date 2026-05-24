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
    body: "Your menu and orders stay in your account.",
    href: "/security",
  },
  {
    id: "handoff",
    title: "Human handoff",
    body: "Staff can jump in on any call.",
  },
  {
    id: "kds-ticket",
    title: "Live kitchen ticket",
    body: "Confirmed carts stream to your kitchen screen during the call.",
  },
  {
    id: "billing",
    title: "No per-minute surprise billing",
    body: "Pay for successful orders—not every ring.",
    href: "/pricing",
  },
];
