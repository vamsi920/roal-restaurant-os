import { NextResponse } from "next/server";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { cloverAuthorizeUrl, getCloverConfig } from "@/lib/pos/clover";
import { signOAuthState } from "@/lib/pos/seal";
import { absoluteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?restaurant_id=… — sends an owner or admin to Clover to approve ROAL for their register. */
export async function GET(req: Request): Promise<Response> {
  const restaurantId = new URL(req.url).searchParams.get("restaurant_id")?.trim();
  if (!restaurantId) return NextResponse.json({ error: "restaurant_id is required" }, { status: 400 });

  const access = await requireRestaurantAccess(restaurantId, { requireAdmin: true });
  if (access.errorResponse) return access.errorResponse;

  const config = getCloverConfig();
  const redirectUri = absoluteUrl("/api/integrations/clover/callback");
  if (!config || !redirectUri) {
    return NextResponse.json({ error: "Clover connection is not available yet." }, { status: 503 });
  }

  const state = signOAuthState({ restaurantId, userId: access.context.user.id });
  return NextResponse.redirect(cloverAuthorizeUrl(config, redirectUri, state));
}
