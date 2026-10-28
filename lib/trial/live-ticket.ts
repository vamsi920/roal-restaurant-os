import type { CallOrderDraft } from "@/lib/ai";
import type { ScannedItem, ScannedMenu } from "@/lib/menu-import/types";

/**
 * The live ticket beside a demo call. The model only says which menu items and how many;
 * every price and the total come from the restaurant's menu here, never from the model.
 */

export type TicketLine = {
  name: string;
  qty: number;
  unitPrice: number | null;
  mods: Array<{ name: string; price: number }>;
  note: string | null;
  lineTotal: number | null;
};

export type LiveTicket = {
  lines: TicketLine[];
  subtotal: number;
  customerName: string | null;
  confirmed: boolean;
};

const norm = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

/** Compact menu for the prompt: one line per item with its options. */
export function menuLinesForPrompt(menu: ScannedMenu): string {
  const out: string[] = [];
  for (const cat of menu.categories) {
    for (const item of cat.items) {
      const mods = (item.modifiers ?? []).map((m) => m.modifier_name).filter(Boolean);
      out.push(`${cat.name}: ${item.name}${mods.length ? ` [options: ${mods.slice(0, 10).join(", ")}]` : ""}`);
    }
  }
  return out.join("\n");
}

function findItem(menu: ScannedMenu, name: string): ScannedItem | null {
  const key = norm(name);
  if (!key) return null;
  const items = menu.categories.flatMap((c) => c.items);
  return (
    items.find((i) => norm(i.name) === key) ??
    items.find((i) => norm(i.name).includes(key) || key.includes(norm(i.name))) ??
    null
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildLiveTicket(menu: ScannedMenu, draft: CallOrderDraft): LiveTicket {
  const lines: TicketLine[] = [];
  for (const raw of draft.i ?? []) {
    const spoken = raw.n?.trim();
    if (!spoken) continue;
    const qty = Math.min(50, Math.max(1, Math.round(Number(raw.q) || 1)));
    const item = findItem(menu, spoken);
    const unitPrice = typeof item?.price === "number" ? item.price : null;
    const mods = (raw.m ?? [])
      .filter((m): m is string => typeof m === "string" && Boolean(m.trim()))
      .slice(0, 8)
      .map((m) => {
        const match = item?.modifiers?.find((x) => norm(x.modifier_name) === norm(m));
        return { name: match?.modifier_name ?? m.trim(), price: typeof match?.extra_price === "number" ? match.extra_price : 0 };
      });
    const each = unitPrice == null ? null : unitPrice + mods.reduce((n, m) => n + m.price, 0);
    lines.push({
      name: item?.name ?? spoken,
      qty,
      unitPrice,
      mods,
      note: raw.note?.trim() || null,
      lineTotal: each == null ? null : round2(each * qty),
    });
  }
  return {
    lines,
    subtotal: round2(lines.reduce((n, l) => n + (l.lineTotal ?? 0), 0)),
    customerName: draft.name?.trim() || null,
    confirmed: Boolean(draft.done) && lines.length > 0,
  };
}
