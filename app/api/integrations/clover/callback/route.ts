import { NextResponse } from "next/server";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { exchangeCloverCode, fetchCloverMerchantName, getCloverConfig } from "@/lib/pos/clover";
import { saveCloverConnection } from "@/lib/pos/connections";
import { verifyOAuthState } from "@/lib/pos/seal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function backToSettings(req: Request, restaurantId: string | null, result: "connected" | "failed"): Response {
  const path = restaurantId ? `/dashboard/restaurants/${restaurantId}/settings` : "/dashboard";
  const url = new URL(path, req.url);
  url.searchParams.set("clover", result);
  url.hash = "register";
  return NextResponse.redirect(url);
}

/** Clover redirects here with ?code&merchant_id&state after the owner approves ROAL. */
export async function GET(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams;
  const state = verifyOAuthState(params.get("state"));
  if (!state) return backToSettings(req, null, "failed");

  const access = await requireRestaurantAccess(state.restaurantId, { requireAdmin: true });
  if (access.errorResponse || access.context.user.id !== state.userId) {
    return backToSettings(req, state.restaurantId, "failed");
  }

  const code = params.get("code")?.trim();
  const merchantId = params.get("merchant_id")?.trim();
  const config = getCloverConfig();
  if (!code || !merchantId || !config) return backToSettings(req, state.restaurantId, "failed");

  try {
    const tokens = await exchangeCloverCode(config, code);
    const merchantName = await fetchCloverMerchantName(config, merchantId, tokens.accessToken).catch(() => null);
    await saveCloverConnection(getDb(), {
      restaurantId: state.restaurantId,
      merchantId,
      merchantName,
      environment: config.environment,
      tokens,
      connectedBy: state.userId,
    });
    return backToSettings(req, state.restaurantId, "connected");
  } catch (e) {
    console.error("[clover/callback] connect failed", e);
    return backToSettings(req, state.restaurantId, "failed");
  }
}
