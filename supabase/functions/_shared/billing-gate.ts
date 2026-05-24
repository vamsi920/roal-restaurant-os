import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type BillingPlanId = "starter" | "growth" | "enterprise";
type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused";

type PlanLimits = {
  max_voice_orders_per_period: number;
};

const UNLIMITED = 1_000_000;

const PLAN_LIMITS: Record<BillingPlanId, PlanLimits> = {
  starter: { max_voice_orders_per_period: 150 },
  growth: { max_voice_orders_per_period: 800 },
  enterprise: { max_voice_orders_per_period: UNLIMITED },
};

const WARNING_RATIO = 0.8;

function stripeConfigured(): boolean {
  return Boolean(
    Deno.env.get("STRIPE_SECRET_KEY") &&
      Deno.env.get("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")
  );
}

function computeLevel(used: number, limit: number): "ok" | "warning" | "exceeded" {
  if (limit >= UNLIMITED) return "ok";
  if (used >= limit) return "exceeded";
  if (used >= limit * WARNING_RATIO) return "warning";
  return "ok";
}

function trialActive(status: SubscriptionStatus, trialEndsAt: string | null): boolean {
  if (status !== "trialing") return false;
  if (!trialEndsAt) return true;
  return new Date(trialEndsAt).getTime() > Date.now();
}

function billingOperational(
  status: SubscriptionStatus,
  trialEndsAt: string | null
): boolean {
  if (status === "canceled" || status === "past_due") return false;
  if (status === "trialing") return trialActive(status, trialEndsAt);
  return status === "active" || status === "paused";
}

async function countVoiceOrders(
  supabase: SupabaseClient,
  organizationId: string,
  since: string,
  until: string
): Promise<number> {
  const { count, error } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("event_type", "voice_order")
    .gte("occurred_at", since)
    .lte("occurred_at", until);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export type VoiceOrderGateResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      body: {
        error: string;
        code: "plan_limit_reached";
        message: string;
        title: string;
        limit_key: "voice_orders";
        recovery_hint: string;
        upgrade_url: string;
      };
    };

export async function assertVoiceOrderBillingGate(
  supabase: SupabaseClient,
  organizationId: string
): Promise<VoiceOrderGateResult> {
  if (!stripeConfigured()) {
    return { ok: true };
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .select(
      "billing_plan, subscription_status, trial_ends_at, billing_period_start, billing_period_end"
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!org) {
    return {
      ok: false,
      status: 402,
      body: {
        error: "plan_limit_reached",
        code: "plan_limit_reached",
        title: "Billing unavailable",
        message: "Organization billing could not be loaded.",
        limit_key: "voice_orders",
        recovery_hint: "Ask the restaurant operator to review billing settings.",
        upgrade_url: "/dashboard/billing",
      },
    };
  }

  if (
    !billingOperational(
      org.subscription_status as SubscriptionStatus,
      org.trial_ends_at as string | null
    )
  ) {
    return {
      ok: false,
      status: 402,
      body: {
        error: "plan_limit_reached",
        code: "plan_limit_reached",
        title: "Subscription inactive",
        message:
          "Voice ordering is paused until billing is active. The operator can update the subscription in the dashboard.",
        limit_key: "voice_orders",
        recovery_hint:
          "Tell the caller you cannot take phone orders right now and offer a callback.",
        upgrade_url: "/dashboard/billing",
      },
    };
  }

  const planId = (org.billing_plan ?? "starter") as BillingPlanId;
  const limits = PLAN_LIMITS[planId] ?? PLAN_LIMITS.starter;
  const periodStart =
    (org.billing_period_start as string | null) ??
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const periodEnd =
    (org.billing_period_end as string | null) ??
    new Date(
      new Date(periodStart).getFullYear(),
      new Date(periodStart).getMonth() + 1,
      1
    ).toISOString();

  const used = await countVoiceOrders(
    supabase,
    organizationId,
    periodStart,
    periodEnd
  );
  const projected = used + 1;
  const limit = limits.max_voice_orders_per_period;
  const level = computeLevel(projected, limit);

  if (level !== "exceeded") {
    return { ok: true };
  }

  return {
    ok: false,
    status: 402,
    body: {
      error: "plan_limit_reached",
      code: "plan_limit_reached",
      title: "Voice order limit reached",
      message: `This account has used all voice orders for the billing period (${used.toLocaleString()} of ${limit.toLocaleString()}).`,
      limit_key: "voice_orders",
      recovery_hint:
        "Politely explain you cannot complete phone orders right now and suggest calling back later or ordering in person.",
      upgrade_url: "/dashboard/billing",
    },
  };
}
