export type ParsedLineItem = {
  name: string;
  quantity: number;
  customizations: string[];
  notes: string | null;
  unitPrice: number | null;
};

export function parsedLinesFromStoredCart(
  lines: Array<{
    name: string;
    quantity: number;
    customizations: string[];
    notes?: string | null;
    unit_price?: number | null;
  }>
): ParsedLineItem[] {
  return lines.map((line) => ({
    name: line.name,
    quantity: line.quantity,
    customizations: line.customizations,
    notes: line.notes ?? null,
    unitPrice: line.unit_price ?? null,
  }));
}

export function parseOrderLineItems(items: unknown): ParsedLineItem[] {
  if (!Array.isArray(items)) return [];

  return items.map((raw) => {
    const line =
      raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};

    const name =
      typeof line.name === "string" && line.name.trim()
        ? line.name.trim()
        : "Item";

    let quantity = 1;
    if (typeof line.quantity === "number" && Number.isFinite(line.quantity)) {
      quantity = Math.max(1, Math.round(line.quantity));
    } else if (typeof line.quantity === "string") {
      const n = parseInt(line.quantity, 10);
      if (Number.isFinite(n) && n > 0) quantity = n;
    }

    const cust = line.customizations;
    const customizations = Array.isArray(cust)
      ? cust
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .map((x) => x.trim())
      : [];

    const notesRaw =
      line.notes ?? line.note ?? line.special_instructions ?? line.instructions;
    const notes =
      typeof notesRaw === "string" && notesRaw.trim() ? notesRaw.trim() : null;

    const priceRaw = line.unit_price ?? line.price;
    let unitPrice: number | null = null;
    if (typeof priceRaw === "number" && Number.isFinite(priceRaw)) {
      unitPrice = priceRaw;
    } else if (typeof priceRaw === "string") {
      const p = parseFloat(priceRaw);
      if (Number.isFinite(p)) unitPrice = p;
    }

    return { name, quantity, customizations, notes, unitPrice };
  });
}
