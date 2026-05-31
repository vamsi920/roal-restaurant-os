import { describe, expect, it } from "vitest";
import {
  validateCartForFinalize,
  validateCartForSync,
  validateCustomerForFinalize,
} from "@/lib/orders/validate-cart";
import {
  ITEM_BURGER_ID,
  ITEM_SOLD_OUT_ID,
  menuItems,
  menuModifiers,
} from "../fixtures/menu";

describe("validateCartForSync", () => {
  it("allows empty cart for in-call sync", () => {
    const result = validateCartForSync([], menuItems, menuModifiers);
    expect(result.ok).toBe(true);
    expect(result.normalizedItems).toHaveLength(0);
  });

  it("accepts valid line by item_id", () => {
    const result = validateCartForSync(
      [{ item_id: ITEM_BURGER_ID, quantity: 2 }],
      menuItems,
      menuModifiers
    );
    expect(result.ok).toBe(true);
    expect(result.normalizedItems[0]).toMatchObject({
      item_id: ITEM_BURGER_ID,
      name: "Classic Burger",
      quantity: 2,
    });
  });

  it("rejects stale item_id", () => {
    const result = validateCartForSync(
      [{ item_id: "99999999-9999-4999-8999-999999999999", quantity: 1 }],
      menuItems,
      menuModifiers
    );
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.code).toBe("stale_item_id");
  });

  it("rejects invalid quantity", () => {
    const result = validateCartForSync(
      [{ name: "Classic Burger", quantity: 0 }],
      menuItems,
      menuModifiers
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "invalid_quantity")).toBe(true);
  });

  it("rejects non-numeric quantity strings", () => {
    const result = validateCartForSync(
      [{ name: "Classic Burger", quantity: "abc" }],
      menuItems,
      menuModifiers
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "invalid_quantity")).toBe(true);
  });

  it("rejects unavailable items on sync", () => {
    const result = validateCartForSync(
      [{ item_id: ITEM_SOLD_OUT_ID, quantity: 1 }],
      menuItems,
      menuModifiers
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "item_unavailable")).toBe(true);
  });

  it("rejects unknown modifiers on sync", () => {
    const result = validateCartForSync(
      [
        {
          item_id: ITEM_BURGER_ID,
          quantity: 1,
          customizations: ["Ghost topping"],
        },
      ],
      menuItems,
      menuModifiers
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "unknown_modifier")).toBe(true);
  });
});

describe("validateCartForFinalize", () => {
  it("rejects empty cart", () => {
    const result = validateCartForFinalize([], menuItems, menuModifiers);
    expect(result.ok).toBe(false);
  });

  it("rejects unavailable items", () => {
    const result = validateCartForFinalize(
      [{ item_id: ITEM_SOLD_OUT_ID, quantity: 1 }],
      menuItems,
      menuModifiers
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "item_unavailable")).toBe(true);
  });

  it("rejects items without a menu price", () => {
    const items = [
      ...menuItems,
      {
        ...menuItems[0],
        id: "00000000-0000-4000-8000-000000000099",
        name: "No Price Burger",
        price: null,
      },
    ];
    const result = validateCartForFinalize(
      [{ item_id: "00000000-0000-4000-8000-000000000099", quantity: 1 }],
      items,
      menuModifiers
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "missing_item_price")).toBe(true);
  });
});

describe("validateCustomerForFinalize", () => {
  it("accepts real guest contact", () => {
    const result = validateCustomerForFinalize("Maria Lopez", "4155551212");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.customer_name).toBe("Maria Lopez");
    }
  });

  it("rejects placeholder name", () => {
    const result = validateCustomerForFinalize("John Doe", "4155551212");
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "placeholder_customer_name")).toBe(
      true
    );
  });

  it("rejects placeholder phone", () => {
    const result = validateCustomerForFinalize("Maria Lopez", "555-000-0000");
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "placeholder_customer_phone")).toBe(
      true
    );
  });
});
