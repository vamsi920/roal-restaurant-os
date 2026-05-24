import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import { createServerSupabase } from "@/lib/supabase/server";
import { MenuEditor } from "./MenuEditor";

export const dynamic = "force-dynamic";

export default async function RestaurantMenuEditorPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const access = await getRestaurantAccessForPage(params.id);
  if (!access) {
    const ctx = await getAuthContext();
    if (!ctx) redirect(`/login?next=/dashboard/restaurants/${params.id}/menu`);
    notFound();
  }

  const { restaurant } = access;
  const supabase = await createServerSupabase();
  const menu = await loadRestaurantMenu(supabase, restaurant.id);

  return (
    <MenuEditor
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      initial={menu}
    />
  );
}
