export const UNAVAILABLE_ITEM_BEHAVIORS = [
  "offer_alternative",
  "escalate_to_staff",
  "decline_skip",
] as const;

export type UnavailableItemBehavior =
  (typeof UNAVAILABLE_ITEM_BEHAVIORS)[number];

export const UNAVAILABLE_ITEM_BEHAVIOR_LABEL: Record<
  UnavailableItemBehavior,
  string
> = {
  offer_alternative: "Offer another menu item",
  escalate_to_staff: "Escalate to manager / staff callback",
  decline_skip: "Apologize and continue without the item",
};

export const UNAVAILABLE_ITEM_BEHAVIOR_HINT: Record<
  UnavailableItemBehavior,
  string
> = {
  offer_alternative:
    "Suggest a similar in-stock item from get_menu_items; do not add the unavailable line.",
  escalate_to_staff:
    "Stop the item; offer staff callback using manager contact on file.",
  decline_skip:
    "Acknowledge it is unavailable; move on without adding it to the cart.",
};

export function parseUnavailableItemBehavior(
  value: unknown
): UnavailableItemBehavior | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return UNAVAILABLE_ITEM_BEHAVIORS.includes(value as UnavailableItemBehavior)
    ? (value as UnavailableItemBehavior)
    : null;
}

export function unavailableItemBehaviorPromptLine(
  behavior: UnavailableItemBehavior,
  notes: string | null
): string {
  const base = UNAVAILABLE_ITEM_BEHAVIOR_HINT[behavior];
  const extra = notes?.trim();
  return extra ? `${base} Restaurant note: ${extra}` : base;
}
