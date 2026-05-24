import type { SupabaseClient } from "@supabase/supabase-js";
import {
  evaluateBillingGate,
  evaluateOrganizationGates,
  type BillingGateAction,
  type GateVerdict,
} from "@/lib/billing/gates";
import { loadOrganizationBilling } from "@/lib/billing/load-billing";
import type { MembershipRole } from "@/lib/types";

export async function loadOrganizationGateVerdicts(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    membershipRole: MembershipRole;
  }
): Promise<Record<BillingGateAction, GateVerdict> | null> {
  const snapshot = await loadOrganizationBilling(supabase, input);
  if (!snapshot) return null;
  return evaluateOrganizationGates(snapshot);
}

export async function assertOrganizationBillingGate(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    membershipRole: MembershipRole;
    action: BillingGateAction;
    additionalUsage?: number;
  }
): Promise<{ ok: true } | { ok: false; verdict: GateVerdict }> {
  const snapshot = await loadOrganizationBilling(supabase, {
    organizationId: input.organizationId,
    membershipRole: input.membershipRole,
  });
  if (!snapshot) {
    return {
      ok: false,
      verdict: {
        action: input.action,
        level: "exceeded",
        allowed: false,
        hardBlocked: true,
        title: "Organization not found",
        message: "Billing could not be resolved for this organization.",
        limitKey: "menu_scans",
        used: 0,
        projectedUsed: 0,
        limit: 0,
        unitLabel: "",
        showUpgrade: false,
        upgradeHref: "/dashboard/billing",
      },
    };
  }

  const verdict = evaluateBillingGate(snapshot, input.action, {
    additionalUsage: input.additionalUsage,
  });
  if (!verdict.allowed) {
    return { ok: false, verdict };
  }
  return { ok: true };
}
