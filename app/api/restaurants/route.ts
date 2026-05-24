import { NextResponse } from "next/server";
import {
  requireAuthContext,
  resolveOrganizationId,
} from "@/lib/auth/context-server";
import { canCreateRestaurant } from "@/lib/auth/roles";
import { ensureRestaurantOnboarding } from "@/lib/onboarding/helpers";
import { assertOrganizationBillingGate } from "@/lib/billing/assert-gate";
import { planLimitJsonResponse } from "@/lib/billing/gate-http";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const auth = await requireAuthContext();
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const orgInput =
      typeof body.organization_id === "string" ? body.organization_id : null;
    const resolved = resolveOrganizationId(auth.context, orgInput);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 403 });
    }

    const membership = auth.context.memberships.find(
      (m) => m.organization_id === resolved.organizationId
    );
    if (!membership || !canCreateRestaurant(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createServerSupabase();
    const locationGate = await assertOrganizationBillingGate(supabase, {
      organizationId: resolved.organizationId,
      membershipRole: membership.role,
      action: "create_restaurant",
      additionalUsage: 1,
    });
    if (!locationGate.ok) {
      return planLimitJsonResponse(locationGate.verdict);
    }

    const { data, error } = await supabase
      .from("restaurants")
      .insert({ name, organization_id: resolved.organizationId })
      .select("*")
      .single();

    if (error) {
      console.error("[restaurants POST]", error.message);
      return NextResponse.json(
        { error: "Could not create restaurant. Try again." },
        { status: 500 }
      );
    }

    await ensureRestaurantOnboarding(
      supabase,
      data.id,
      resolved.organizationId
    );

    return NextResponse.json({ restaurant: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[restaurants POST]", msg);
    return NextResponse.json(
      { error: "Could not create restaurant. Try again." },
      { status: 500 }
    );
  }
}
