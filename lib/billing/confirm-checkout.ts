import type { Db } from "@/lib/db";
import type { StripeClient } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/lib/billing/stripe-webhook";

/**
 * When the owner lands back from payment, read the checkout result directly so the page shows
 * the plan as active right away, even if the background payment event is still on its way.
 * Phone lines are bought separately (webhook or /api/billing/phone-lines) to keep the page fast.
 */
export async function confirmCheckoutSession(
  db: Db,
  stripe: StripeClient,
  input: { sessionId: string; organizationId: string }
): Promise<boolean> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(input.sessionId)) return false;
  try {
    const session = await stripe.get<Record<string, unknown>>(`/checkout/sessions/${input.sessionId}`);
    if (session.client_reference_id !== input.organizationId) return false;
    if (session.status !== "complete") return false;
    const outcome = await handleStripeEvent(
      db,
      { id: `return_${input.sessionId}`, type: "checkout.session.completed", data: { object: session } },
      { provisionLines: async () => [] }
    );
    return outcome.handled && outcome.status === "active";
  } catch (e) {
    console.error("[billing] confirm checkout", e instanceof Error ? e.message : e);
    return false;
  }
}
