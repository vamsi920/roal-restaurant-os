import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getServerSupabase, getServiceRoleSupabase } from "@/lib/supabase/server";
import { supabaseProjectRefFromUrl } from "@/lib/supabaseProjectRef";
import type {
  DbCategory,
  DbItem,
  DbModifier,
  DraftOrderRow,
  PhoneOrderReceiptRow,
  Restaurant,
} from "@/lib/types";
import { LiveMenuSidebar } from "./LiveMenuSidebar";
import { LiveOrdersPanel } from "./LiveOrdersPanel";
import { MenuScanner } from "./MenuScanner";
import { VoiceAgentPanel } from "./VoiceAgentPanel";

export const dynamic = "force-dynamic";

export default async function RestaurantKDSPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const supabase = getServerSupabase();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", params.id)
    .single<Restaurant>();

  if (!restaurant) {
    notFound();
  }

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseRef = supabaseProjectRefFromUrl(supabaseUrl);

  const db = getServiceRoleSupabase() ?? getServerSupabase();

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

  return (
    <div className="space-y-5 sm:space-y-6">
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
        <span className="min-w-0 truncate font-medium text-black" style={{ color: "#000000" }}>{restaurant.name}</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-subtle">
            <span className="h-px w-6 bg-line" />
            KDS Console
          </div>
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-black sm:text-3xl" style={{ color: "#000000" }}>
            {restaurant.name}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="chip">
            <span className="pulse-dot" />
            Realtime synced
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[420px_1fr]">
        <LiveMenuSidebar
          restaurantId={restaurant.id}
          initialCategories={initialCategories}
          initialItems={initialItems}
          initialModifiers={initialModifiers}
        />
        <MenuScanner restaurantId={restaurant.id} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <LiveOrdersPanel
          restaurantId={restaurant.id}
          initialDraftOrders={initialDraftOrders}
          initialReceipts={initialReceipts}
        />
        <VoiceAgentPanel
          supabaseRef={supabaseRef}
          edgeBase={supabaseUrl.replace(/\/$/, "")}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
        />
      </div>
    </div>
  );
}
