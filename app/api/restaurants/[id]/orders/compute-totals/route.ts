import { NextResponse } from "next/server";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { computeOrderTotals } from "@/lib/orders/compute-order-totals";
import { parsedLinesFromStoredCart } from "@/lib/orders/line-items";
import { buildMenuPriceContext } from "@/lib/orders/menu-price-context";
import {
  orderPricingFromProfile,
  type OrderPricingSettings,
} from "@/lib/orders/pricing-settings";
import {
  formatCartValidationError,
  validateCartForFinalize,
} from "@/lib/orders/validate-cart";
import { createServerSupabase } from "@/lib/supabase/server";
import type { DbItem, DbModifier, RestaurantProfile } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    if (!restaurantId) {
      return NextResponse.json({ error: "missing restaurant id" }, { status: 400 });
    }

    const access = await requireRestaurantAccess(restaurantId);
    if (access.errorResponse) return access.errorResponse;

    let body: {
      items?: unknown;
      pricing?: Partial<OrderPricingSettings>;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { error: "items must be an array" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    const { data: profile } = await supabase
      .from("restaurant_profiles")
      .select("tax_rate_percent, service_fee_percent")
      .eq("restaurant_id", restaurantId)
      .maybeSingle<Pick<RestaurantProfile, "tax_rate_percent" | "service_fee_percent">>();

    const basePricing = profile
      ? orderPricingFromProfile(profile)
      : orderPricingFromProfile({
          tax_rate_percent: 0,
          service_fee_percent: 0,
        });

    const pricing: OrderPricingSettings = {
      ...basePricing,
      ...(body.pricing?.taxRatePercent != null
        ? { taxRatePercent: body.pricing.taxRatePercent }
        : {}),
      ...(body.pricing?.serviceFeePercent != null
        ? { serviceFeePercent: body.pricing.serviceFeePercent }
        : {}),
      ...(body.pricing?.discountPercent != null
        ? { discountPercent: body.pricing.discountPercent }
        : {}),
      ...(body.pricing?.discountAmountCents != null
        ? { discountAmountCents: body.pricing.discountAmountCents }
        : {}),
    };

    const { data: categories } = await supabase
      .from("categories")
      .select("id")
      .eq("restaurant_id", restaurantId);

    const categoryIds = (categories ?? []).map((c) => c.id);
    let items: DbItem[] = [];
    let modifiers: DbModifier[] = [];

    if (categoryIds.length > 0) {
      const { data: itemRows } = await supabase
        .from("items")
        .select("*")
        .in("category_id", categoryIds);
      items = (itemRows as DbItem[]) ?? [];
      const itemIds = items.map((i) => i.id);
      if (itemIds.length > 0) {
        const { data: modRows } = await supabase
          .from("modifiers")
          .select("*")
          .in("item_id", itemIds);
        modifiers = (modRows as DbModifier[]) ?? [];
      }
    }

    const cartValidation = validateCartForFinalize(
      body.items,
      items,
      modifiers
    );
    if (!cartValidation.ok) {
      return NextResponse.json(
        formatCartValidationError(cartValidation, {
          tool: "compute_totals",
        }),
        { status: 400 }
      );
    }

    const menuCtx = buildMenuPriceContext(items, modifiers);
    const lineItems = parsedLinesFromStoredCart(cartValidation.normalizedItems);
    const totals = computeOrderTotals(lineItems, menuCtx, pricing);

    return NextResponse.json({ ok: true, totals, pricing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
