import { describe, expect, it } from "vitest";
import {
  validateCartForFinalize,
  validateCartForSync,
} from "@/lib/orders/validate-cart";
import {
  validateCartForFinalize as edgeValidateCartForFinalize,
  validateCartForSync as edgeValidateCartForSync,
} from "../../supabase/functions/_shared/order-validate";
import {
  ITEM_BURGER_ID,
  ITEM_SOLD_OUT_ID,
  menuItems,
  menuModifiers,
} from "../fixtures/menu";

function expectParity(
  label: string,
  next: ReturnType<typeof validateCartForSync>,
  edge: ReturnType<typeof edgeValidateCartForSync>
) {
  expect(edge.ok, `${label} edge ok`).toBe(next.ok);
  expect(edge.issues.map((i) => i.code).sort(), `${label} issue codes`).toEqual(
    next.issues.map((i) => i.code).sort()
  );
  expect(edge.normalizedItems.length, `${label} line count`).toBe(
    next.normalizedItems.length
  );
}

describe("Next vs Edge cart validation parity", () => {
  it("sync: empty cart", () => {
    const payload = [[], menuItems, menuModifiers] as const;
    expectParity(
      "empty sync",
      validateCartForSync(...payload),
      edgeValidateCartForSync(...payload)
    );
  });

  it("sync: valid item_id line", () => {
    const payload = [
      [{ item_id: ITEM_BURGER_ID, quantity: 2 }],
      menuItems,
      menuModifiers,
    ] as const;
    expectParity(
      "valid sync",
      validateCartForSync(...payload),
      edgeValidateCartForSync(...payload)
    );
  });

  it("sync: stale item_id", () => {
    const payload = [
      [{ item_id: "99999999-9999-4999-8999-999999999999", quantity: 1 }],
      menuItems,
      menuModifiers,
    ] as const;
    expectParity(
      "stale sync",
      validateCartForSync(...payload),
      edgeValidateCartForSync(...payload)
    );
  });

  it("sync: unavailable item", () => {
    const payload = [
      [{ item_id: ITEM_SOLD_OUT_ID, quantity: 1 }],
      menuItems,
      menuModifiers,
    ] as const;
    expectParity(
      "unavailable sync",
      validateCartForSync(...payload),
      edgeValidateCartForSync(...payload)
    );
  });

  it("sync: unknown modifier", () => {
    const payload = [
      [
        {
          item_id: ITEM_BURGER_ID,
          quantity: 1,
          customizations: ["Not on menu"],
        },
      ],
      menuItems,
      menuModifiers,
    ] as const;
    expectParity(
      "bad modifier sync",
      validateCartForSync(...payload),
      edgeValidateCartForSync(...payload)
    );
  });

  it("finalize: empty cart", () => {
    const payload = [[], menuItems, menuModifiers] as const;
    expectParity(
      "empty finalize",
      validateCartForFinalize(...payload),
      edgeValidateCartForFinalize(...payload)
    );
  });
});
