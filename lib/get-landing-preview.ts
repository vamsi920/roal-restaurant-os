import { getServerSupabase } from "@/lib/supabase/server";
import {
  LANDING_DEMO,
  type LandingCategory,
  type LandingMenuItem,
  type LandingOrderLine,
  type LandingPreviewData,
  landingMenuTotals,
} from "@/lib/landing-demo-data";
import type { DbCategory, DbItem, DbModifier, DraftOrderRow, PhoneOrderReceiptRow } from "@/lib/types";

function parseOrderLines(items: unknown): LandingOrderLine[] {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    const line = raw as Record<string, unknown>;
    const name = typeof line.name === "string" ? line.name : "Item";
    const quantity =
      typeof line.quantity === "number"
        ? line.quantity
        : typeof line.quantity === "string"
          ? Number.parseInt(line.quantity, 10) || 1
          : 1;
    const cust = line.customizations;
    const customizations = Array.isArray(cust)
      ? cust.filter((x): x is string => typeof x === "string")
      : undefined;
    return { name, quantity, customizations };
  });
}

export async function getLandingPreview(): Promise<LandingPreviewData> {
  try {
    const supabase = await getServerSupabase();
    const { data: restaurants, error: rErr } = await supabase
      .from("restaurants")
      .select("id, name")
      .order("created_at", { ascending: false })
      .limit(1);

    if (rErr || !restaurants?.[0]) return LANDING_DEMO;

    const restaurant = restaurants[0];
    const { data: categories } = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order", { ascending: true });

    const cats = (categories ?? []) as DbCategory[];
    const categoryIds = cats.map((c) => c.id);

    const { data: items } =
      categoryIds.length > 0
        ? await supabase
            .from("items")
            .select("*")
            .in("category_id", categoryIds)
            .order("name", { ascending: true })
            .limit(24)
        : { data: [] as DbItem[] };

    const itemList = (items ?? []) as DbItem[];
    const itemIds = itemList.map((i) => i.id);

    const { data: modifiers } =
      itemIds.length > 0
        ? await supabase.from("modifiers").select("*").in("item_id", itemIds)
        : { data: [] as DbModifier[] };

    const modsByItem = new Map<string, DbModifier[]>();
    for (const m of (modifiers ?? []) as DbModifier[]) {
      const arr = modsByItem.get(m.item_id) ?? [];
      arr.push(m);
      modsByItem.set(m.item_id, arr);
    }

    const grouped: LandingCategory[] = cats.map((cat) => ({
      id: cat.id,
      name: cat.name,
      sort_order: cat.sort_order,
      items: itemList
        .filter((it) => it.category_id === cat.id)
        .map(
          (it): LandingMenuItem => ({
            id: it.id,
            name: it.name,
            description: it.description,
            price: it.price,
            is_available: it.is_available,
            modifiers: (modsByItem.get(it.id) ?? []).map((m) => ({
              group_name: m.group_name,
              modifier_name: m.modifier_name,
            })),
          })
        ),
    }));

    const { data: drafts } = await supabase
      .from("draft_orders")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(1);

    const draft = (drafts?.[0] ?? null) as DraftOrderRow | null;

    const { data: receipts } = await supabase
      .from("phone_order_receipts")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const receipt = (receipts?.[0] ?? null) as PhoneOrderReceiptRow | null;

    const totals = landingMenuTotals({
      ...LANDING_DEMO,
      categories: grouped,
    });

    const hasMenu = grouped.some((c) => c.items.length > 0);
    if (!hasMenu && !draft && !receipt) return LANDING_DEMO;

    return {
      source: "live",
      restaurantName: restaurant.name,
      categories: hasMenu ? grouped : LANDING_DEMO.categories,
      scanStats: hasMenu ? totals : LANDING_DEMO.scanStats,
      liveDraft: draft
        ? {
            session_id: draft.session_id,
            customer_name: draft.customer_name,
            customer_phone: draft.customer_phone,
            items: parseOrderLines(draft.items),
            updated_at: draft.updated_at,
          }
        : LANDING_DEMO.liveDraft,
      completedReceipt: receipt
        ? {
            customer_name: receipt.customer_name,
            items: parseOrderLines(receipt.items),
            created_at: receipt.created_at,
          }
        : LANDING_DEMO.completedReceipt,
    };
  } catch {
    return LANDING_DEMO;
  }
}
