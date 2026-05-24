import { describe, expect, it } from "vitest";
import { parseOrderLineItems } from "@/lib/orders/line-items";

describe("parseOrderLineItems", () => {
  it("parses modifiers and special instructions", () => {
    const lines = parseOrderLineItems([
      {
        name: "Burger",
        quantity: 2,
        customizations: ["Extra cheese", "Bacon"],
        special_instructions: "No onions",
      },
    ]);
    expect(lines[0].customizations).toEqual(["Extra cheese", "Bacon"]);
    expect(lines[0].notes).toBe("No onions");
    expect(lines[0].quantity).toBe(2);
  });
});
