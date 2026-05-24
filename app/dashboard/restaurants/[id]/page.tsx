import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { getPublicEnv } from "@/lib/env.public";
import { createServerSupabase, getServiceRoleSupabase } from "@/lib/supabase/server";
import { supabaseProjectRefFromUrl } from "@/lib/supabaseProjectRef";
import type {
  DbCategory,
  DbItem,
  DbModifier,
  DraftOrderRow,
  PhoneOrderReceiptRow,
} from "@/lib/types";
import { LiveMenuSidebar } from "./LiveMenuSidebar";
import { LiveOrdersPanel } from "./LiveOrdersPanel";
import { MenuScanner } from "./MenuScanner";
import { MenuImportHistory } from "@/components/menu-import/MenuImportHistory";
import { RestaurantProfileSettings } from "./RestaurantProfileSettings";
import { RestaurantHoursSettings } from "./RestaurantHoursSettings";
import { loadRestaurantHoursBundle } from "@/lib/restaurant-hours/helpers";
import { VoiceAgentPanel } from "./VoiceAgentPanel";
import { VoiceAgentTestHarness } from "./VoiceAgentTestHarness";
import "@/app/dashboard/restaurants/[id]/kds-workspace.css";
import { ensureRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { orderPricingFromProfile } from "@/lib/orders/pricing-settings";
import { loadOrganizationGateVerdicts } from "@/lib/billing/assert-gate";
import { notifyStuckOrdersForOrganization } from "@/lib/notifications/stuck-orders";
import { loadVoiceAgentControlCenter } from "@/lib/voice-agent/load-control-center";

export const dynamic = "force-dynamic";

export default async function RestaurantKDSPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const access = await getRestaurantAccessForPage(params.id);
  if (!access) {
    const ctx = await getAuthContext();
    if (!ctx) redirect(`/login?next=/dashboard/restaurants/${params.id}`);
    notFound();
  }
  const { restaurant, role } = access;
  const supabase = await createServerSupabase();
  const billingGates = await loadOrganizationGateVerdicts(supabase, {
    organizationId: restaurant.organization_id,
    membershipRole: role,
  });

  const { data: orgRestaurants } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("organization_id", restaurant.organization_id);
  void notifyStuckOrdersForOrganization(supabase, {
    organizationId: restaurant.organization_id,
    restaurantNames: new Map(
      (orgRestaurants ?? []).map((r) => [r.id as string, r.name as string])
    ),
  });
  const profile = await ensureRestaurantProfile(
    supabase,
    restaurant.id,
    restaurant.organization_id
  );

  const hoursBundle = await loadRestaurantHoursBundle(supabase, restaurant.id);

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", params.id)
    .order("sort_order", { ascending: true });

  const initialCategories: DbCategory[] = categories ?? [];

  const categoryIds = initialCategories.map((c) => c.id);
  const { data: items } =
    categoryIds.length > 0
      ? await supabase
          .from("items")
          .select("*")
          .in("category_id", categoryIds)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true })
      : { data: [] as DbItem[] };

  const initialItems: DbItem[] = (items as DbItem[]) ?? [];

  const itemIds = initialItems.map((i) => i.id);
  const { data: modifiers } =
    itemIds.length > 0
      ? await supabase
          .from("modifiers")
          .select("*")
          .in("item_id", itemIds)
      : { data: [] as DbModifier[] };

  const initialModifiers: DbModifier[] = (modifiers as DbModifier[]) ?? [];

  const supabaseUrl = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const supabaseRef = supabaseProjectRefFromUrl(supabaseUrl);

  const db = getServiceRoleSupabase() ?? (await createServerSupabase());

  const { data: draftOrders, error: draftErr } = await db
    .from("draft_orders")
    .select("*")
    .eq("restaurant_id", params.id)
    .order("updated_at", { ascending: false });

  if (draftErr) {
    console.error("draft_orders load", draftErr.message);
  }

  const { data: receiptRows, error: receiptErr } = await db
    .from("phone_order_receipts")
    .select("*")
    .eq("restaurant_id", params.id)
    .order("created_at", { ascending: false })
    .limit(150);

  if (receiptErr) {
    console.error("phone_order_receipts load", receiptErr.message);
  }

  const initialDraftOrders: DraftOrderRow[] =
    (draftOrders as DraftOrderRow[]) ?? [];
  const initialReceipts: PhoneOrderReceiptRow[] = receiptErr
    ? []
    : ((receiptRows as PhoneOrderReceiptRow[]) ?? []);
  const ordersLoadError =
    draftErr?.message ?? receiptErr?.message ?? null;

  const pricingSettings = orderPricingFromProfile(profile);

  const voiceAgentCenter = await loadVoiceAgentControlCenter({
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    edgeBase: supabaseUrl.replace(/\/$/, ""),
    supabaseRef,
    profile,
  });

  return (
    <div className="kds-workspace space-y-5 sm:space-y-6">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto text-sm [-webkit-overflow-scrolling:touch]">
        <Link
          href="/dashboard/restaurants"
          className="flex shrink-0 items-center gap-1.5 text-muted transition-colors hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Restaurants
        </Link>
        <span className="shrink-0 text-subtle">/</span>
        <span className="min-w-0 truncate font-medium text-ink">{restaurant.name}</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-subtle">
            <span className="h-px w-6 bg-line" />
            KDS Console
          </div>
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {restaurant.name}
          </h1>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/restaurants/${restaurant.id}/menu`}
            className="btn-ghost text-sm"
          >
            Edit menu
          </Link>
          <div className="chip">
            <span className="pulse-dot" />
            Realtime synced
          </div>
        </div>
      </div>

      <RestaurantProfileSettings restaurant={restaurant} profile={profile} />

      {hoursBundle ? (
        <RestaurantHoursSettings
          restaurantId={restaurant.id}
          bundle={hoursBundle}
        />
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <LiveOrdersPanel
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          menuItems={initialItems}
          menuModifiers={initialModifiers}
          pricingSettings={pricingSettings}
          initialDraftOrders={initialDraftOrders}
          initialReceipts={initialReceipts}
          initialLoadError={ordersLoadError}
        />
        <VoiceAgentPanel
          initialCenter={voiceAgentCenter}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          voiceOrderGate={billingGates?.voice_order ?? null}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <LiveMenuSidebar
          restaurantId={restaurant.id}
          initialCategories={initialCategories}
          initialItems={initialItems}
          initialModifiers={initialModifiers}
        />
        <MenuScanner
          restaurantId={restaurant.id}
          menuScanGate={billingGates?.menu_scan ?? null}
        />
      </div>

      <MenuImportHistory restaurantId={restaurant.id} />

      <VoiceAgentTestHarness restaurantId={restaurant.id} />
    </div>
  );
}
