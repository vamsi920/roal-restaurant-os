import { NextResponse } from "next/server";
import {
  requireAuthContext,
  resolveOrganizationId,
} from "@/lib/auth/context-server";
import { loadOrganizationGateVerdicts } from "@/lib/billing/assert-gate";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAuthContext();
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const orgInput = url.searchParams.get("organization_id");
  const resolved = resolveOrganizationId(auth.context, orgInput);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 403 });
  }

  const membership = auth.context.memberships.find(
    (m) => m.organization_id === resolved.organizationId
  );
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getDb();
  const gates = await loadOrganizationGateVerdicts(supabase, {
    organizationId: resolved.organizationId,
    membershipRole: membership.role,
  });

  if (!gates) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json({ gates });
}
