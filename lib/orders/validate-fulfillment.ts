export type FulfillmentServiceModes = {
  allowsPickup: boolean;
  allowsDelivery: boolean;
};

export type FulfillmentValidationIssue = {
  code: string;
  message: string;
  suggestion: string;
};

const PLACEHOLDER_ADDRESS_RE =
  /^(tbd|n\/a|na|none|unknown|test|pending|\.+|123 main(?: st(?:reet)?)?|address|delivery address)$/i;

export function serviceModesFromProfileFlags(profile: {
  allows_pickup?: boolean | null;
  allows_delivery?: boolean | null;
} | null): FulfillmentServiceModes {
  return {
    allowsPickup: profile?.allows_pickup === true,
    allowsDelivery: profile?.allows_delivery === true,
  };
}

export function isRealDeliveryAddress(
  address: string | null | undefined
): boolean {
  const trimmed = address?.trim() ?? "";
  if (trimmed.length < 8) return false;
  if (PLACEHOLDER_ADDRESS_RE.test(trimmed)) return false;
  if (
    !/\d/.test(trimmed) &&
    !/\b(st|street|ste|suite|ave|avenue|rd|road|blvd|boulevard|drive|dr|lane|ln|way|court|ct|pl|place)\b/i.test(
      trimmed
    )
  ) {
    return false;
  }
  return true;
}

export function resolveFulfillmentType(
  value: string | null | undefined
): "pickup" | "delivery" {
  return value === "delivery" ? "delivery" : "pickup";
}

export function validateFulfillmentForOrder(input: {
  allowsPickup: boolean;
  allowsDelivery: boolean;
  fulfillmentType: string | null | undefined;
  deliveryAddress?: string | null;
  requireDeliveryAddress?: boolean;
}): { ok: true; fulfillmentType: "pickup" | "delivery" } | {
  ok: false;
  issue: FulfillmentValidationIssue;
} {
  if (!input.allowsPickup && !input.allowsDelivery) {
    return {
      ok: false,
      issue: {
        code: "fulfillment_unavailable",
        message:
          "This restaurant has no pickup or delivery ordering enabled on its profile.",
        suggestion:
          "Tell the guest ordering is unavailable and offer to take a message for staff.",
      },
    };
  }

  const fulfillmentType = resolveFulfillmentType(input.fulfillmentType);

  if (fulfillmentType === "pickup" && !input.allowsPickup) {
    return {
      ok: false,
      issue: {
        code: "pickup_not_offered",
        message: "Pickup is not offered for this restaurant.",
        suggestion:
          "Use fulfillment_type delivery with a real delivery_address, or explain delivery-only service.",
      },
    };
  }

  if (fulfillmentType === "delivery" && !input.allowsDelivery) {
    return {
      ok: false,
      issue: {
        code: "delivery_not_offered",
        message: "Delivery is not offered for this restaurant.",
        suggestion:
          "Use fulfillment_type pickup or explain pickup-only service.",
      },
    };
  }

  if (
    fulfillmentType === "delivery" &&
    input.requireDeliveryAddress !== false &&
    !isRealDeliveryAddress(input.deliveryAddress)
  ) {
    return {
      ok: false,
      issue: {
        code: "missing_delivery_address",
        message:
          "Delivery orders require a full street delivery address before finalizing.",
        suggestion:
          "Ask the guest for street number, street name, city, and any unit or gate notes, then retry.",
      },
    };
  }

  return { ok: true, fulfillmentType };
}

export function formatFulfillmentValidationError(
  issue: FulfillmentValidationIssue,
  tool: "sync_draft_order" | "finalize_order"
): Record<string, unknown> {
  return {
    error: issue.code,
    code: issue.code,
    message: issue.message,
    issues: [
      {
        path: "fulfillment",
        code: issue.code,
        message: issue.message,
        suggestion: issue.suggestion,
      },
    ],
    recovery_hint: issue.suggestion,
    tool,
  };
}

export function fulfillmentLabelFromOrderRow(
  row:
    | {
        fulfillment_type?: string | null;
        delivery_address?: string | null;
      }
    | null
    | undefined
): "Pickup" | "Delivery" | null {
  if (!row) return null;
  if (row.fulfillment_type === "delivery") return "Delivery";
  if (row.fulfillment_type === "pickup") return "Pickup";
  if (row.delivery_address?.trim()) return "Delivery";
  return "Pickup";
}
