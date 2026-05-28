import Link from "next/link";
import {
  RESTAURANT_LIVE_ORDERS_LABEL,
  RESTAURANT_MENU_AGENT_LABEL,
} from "@/lib/dashboard-restaurant-labels";

const RUNBOOKS = [
  {
    title: "Menu scan failed or looks wrong",
    steps: [
      "Re-upload a flat, well-lit photo of one menu page at a time.",
      "Review the import preview before committing; discard and rescan if categories are off.",
      `Use ${RESTAURANT_MENU_AGENT_LABEL} for quick fixes; clear menu only when starting fresh.`,
    ],
  },
  {
    title: "Voice agent not syncing orders",
    steps: [
      `Open ${RESTAURANT_MENU_AGENT_LABEL} → Connect or Re-sync agent.`,
      "Confirm Edge Functions are deployed and AGENT_TOOL_SIGNING_SECRET matches your host.",
      "Run the on-page test harness (get_menu → sync_draft → finalize).",
    ],
  },
  {
    title: "Realtime degraded on Live orders",
    steps: [
      "Orders still refresh every 6 seconds while polling.",
      "Check Supabase Realtime publication includes draft_orders and phone_order_receipts.",
      "Verify firewall allows wss://<project>.supabase.co/realtime/v1.",
    ],
  },
  {
    title: "Stuck or missing kitchen orders",
    steps: [
      `Use Refresh on ${RESTAURANT_LIVE_ORDERS_LABEL}; check Queue vs Live vs Done tabs.`,
      "Accept new orders from the queue before they time out.",
      "See notification settings for stuck-order alerts.",
    ],
  },
] as const;

export function SupportHub() {
  return (
    <div className="support-hub dashboard-page dashboard-page--medium min-w-0 max-w-full space-y-6 overflow-x-hidden sm:space-y-8">
      <header className="dashboard-page__header min-w-0">
        <p className="dashboard-page__eyebrow">Support</p>
        <h1 className="dashboard-page__title">Help &amp; runbooks</h1>
        <p className="dashboard-page__lead">
          Quick fixes for setup and service. For pilot onboarding or billing, use
          contact below.
        </p>
      </header>

      <div className="support-hub__cards grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
        {RUNBOOKS.map((rb) => (
          <section key={rb.title} className="support-hub__card dashboard-panel min-w-0">
            <h2 className="dashboard-page__section-title">{rb.title}</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-muted">
              {rb.steps.map((step) => (
                <li key={step} className="text-pretty [overflow-wrap:anywhere]">
                  {step}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <section className="dashboard-panel dashboard-panel--muted min-w-0">
        <h2 className="dashboard-page__section-title">More resources</h2>
        <ul className="mt-3 space-y-2.5 text-sm leading-relaxed">
          <li>
            <Link href="/dashboard/onboarding" className="text-accent hover:underline">
              Setup wizard
            </Link>
            <span className="text-muted"> — first-store checklist</span>
          </li>
          <li>
            <Link
              href="/dashboard/settings/notifications"
              className="text-accent hover:underline"
            >
              Notifications
            </Link>
            <span className="text-muted"> — order complete, sync fail, stuck orders</span>
          </li>
          <li>
            <Link href="/api/health" className="text-accent hover:underline">
              Platform health
            </Link>
            <span className="text-muted"> — JSON status for deploy checks</span>
          </li>
          <li>
            <Link href="/contact" className="text-accent hover:underline">
              Contact
            </Link>
            <span className="text-muted"> — pilot and billing questions</span>
          </li>
        </ul>
      </section>

      <div className="dashboard-page__actions dashboard-page__actions--row">
        <Link href="/dashboard/restaurants" className="btn-primary inline-flex">
          Locations
        </Link>
        <Link href="/contact" className="btn-ghost inline-flex">
          Contact support
        </Link>
      </div>
    </div>
  );
}
