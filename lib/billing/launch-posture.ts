/** Launch billing posture: one success-based plan, started online by the owner. */
export const BILLING_LAUNCH_POSTURE = {
  model: "Success-based pricing",
  pilotRate: "$0.90 per successful phone order",
  pilotRateDetail:
    "Missed and no-order calls are not charged. FAQ-only calls, voicemail, callbacks, reservations without orders, handoffs, and failed calls are also free.",
  selfServeCheckout:
    "Owners start the plan online from Billing; a card is saved and completed orders are billed monthly.",
  pilotBilling:
    "Pilot and manual billing use written terms—contact sales to confirm your rate before live guest traffic.",
  devMode:
    "Development mode uses relaxed limits so onboarding, menu scans, and voice tests work without Stripe keys.",
  contactPath: "/contact",
  publicPricingPath: "/pricing",
} as const;

export function isSelfServeCheckoutAvailable(checkoutEnabled: boolean): boolean {
  return checkoutEnabled;
}
