/** Shared pricing message — use on marketing surfaces; detail stays in FAQ. */

export const PRICING_SUCCESS_HEADLINE = "Only pay for successful orders" as const;

/** Homepage pricing band — same idea, layman “completed” wording. */
export const PRICING_VALUE_HEADLINE = "Only pay for completed orders" as const;

export const PRICING_RATE_AMOUNT = "$0.90" as const;
export const PRICING_HOME_RATE_UNIT = "each completed order" as const;
export const PRICING_RATE_UNIT = "per successful order" as const;
export const PRICING_RATE_LINE = "$0.90 per successful order" as const;
export const PRICING_NO_ORDER_LINE =
  "If it does not become an order, you do not pay." as const;

/** Pill + FAQ shorthand (matches published pilot rate). */
export const PRICING_PILL_PRICE = "$0.90/order" as const;

/** Hero pricing link — full line when rate matches {@link PRICING_RATE_AMOUNT}. */
export const PRICING_HERO_SIGNAL =
  `Only pay for real orders - ${PRICING_RATE_AMOUNT}` as const;

/** Two-line owner explainer — pay vs no-pay, with short examples. */
export const PRICING_ORDER_EXPLAINER = {
  titleId: "pricing-orders-heading",
  title: "What counts as an order",
  payLine: "Pay $0.90 when pickup confirms and the ticket hits your kitchen.",
  payExamples: ["Name, phone, and items confirmed on the call"] as const,
  noPayLine: "No order on the call—no charge.",
  noPayExamples: ["Wrong number, hang-up, or test with no ticket"] as const,
} as const;
