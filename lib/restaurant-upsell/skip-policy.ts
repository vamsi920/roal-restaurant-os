import type { UpsellExperimentVariant } from "@/lib/restaurant-upsell/experiment";

export type UpsellCallIntent =
  | "order"
  | "faq"
  | "voicemail"
  | "callback"
  | "handoff"
  | "reservation"
  | "no_order"
  | "other";

export type UpsellSkipContext = {
  rushed?: boolean;
  angry?: boolean;
  intent?: UpsellCallIntent;
  experimentVariant?: UpsellExperimentVariant;
  cartLineCount?: number;
};

export function shouldSkipProactiveUpsell(context: UpsellSkipContext): boolean {
  if (context.experimentVariant === "control") return true;
  if (context.rushed) return true;
  if (context.angry) return true;

  switch (context.intent) {
    case "faq":
    case "voicemail":
    case "callback":
    case "handoff":
    case "reservation":
    case "no_order":
      return true;
    default:
      break;
  }

  return false;
}

export function upsellSkipReason(context: UpsellSkipContext): string | null {
  if (!shouldSkipProactiveUpsell(context)) return null;
  if (context.experimentVariant === "control") {
    return "control experiment bucket";
  }
  if (context.rushed) return "rushed caller";
  if (context.angry) return "angry caller";
  switch (context.intent) {
    case "faq":
      return "faq-only call";
    case "voicemail":
      return "voicemail";
    case "callback":
      return "callback request";
    case "handoff":
      return "staff handoff";
    case "reservation":
      return "reservation request";
    case "no_order":
      return "no-order call";
    default:
      return "call context";
  }
}
