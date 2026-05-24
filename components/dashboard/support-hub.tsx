import Link from "next/link";

const RUNBOOKS = [
  {
    title: "Menu scan failed or looks wrong",
    steps: [
      "Re-upload a flat, well-lit photo of one menu page at a time.",
      "Review the import preview before committing; discard and rescan if categories are off.",
      "Use Edit menu for quick fixes; clear menu only when starting fresh.",
    ],
  },
  {
    title: "Voice agent not syncing orders",
    steps: [
      "Open the KDS voice panel → Connect or Re-sync agent.",
      "Confirm Edge Functions are deployed and AGENT_TOOL_SIGNING_SECRET matches your host.",
      "Run the on-page test harness (get_menu → sync_draft → finalize).",
    ],
  },
  {
    title: "Realtime degraded on KDS",
    steps: [
      "Orders still refresh every 6 seconds while polling.",
      "Check Supabase Realtime publication includes draft_orders and phone_order_receipts.",
      "Verify firewall allows wss://<project>.supabase.co/realtime/v1.",
    ],
  },
  {
    title: "Stuck or missing kitchen orders",
    steps: [
      "Use Refresh on Phone orders; check Queue vs Live vs Done tabs.",
      "Accept new orders from the queue before they time out.",
      "See notification settings for stuck-order alerts.",
    ],
  },
] as const;

export function SupportHub() {
  return (
    <div className="mx-auto max-w-3xl min-w-0 space-y-10">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
          Support
        </p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Help for you and your line staff
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted">
          Quick runbooks for the most common setup and service issues. For pilot
          onboarding or billing questions, use contact below.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {RUNBOOKS.map((rb) => (
          <section
            key={rb.title}
            className="rounded-xl border border-line bg-card p-5 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-ink">{rb.title}</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-muted">
              {rb.steps.map((step) => (
                <li key={step} className="text-pretty">
                  {step}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-line bg-elev p-5">
        <h2 className="text-sm font-semibold text-ink">More resources</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/dashboard/onboarding" className="text-accent hover:underline">
              Onboarding wizard
            </Link>
            <span className="text-muted"> — guided setup checklist</span>
          </li>
          <li>
            <Link
              href="/dashboard/settings/notifications"
              className="text-accent hover:underline"
            >
              Notification settings
            </Link>
            <span className="text-muted"> — order complete, sync fail, stuck orders</span>
          </li>
          <li>
            <Link href="/api/health" className="text-accent hover:underline">
              Platform health
            </Link>
            <span className="text-muted"> — JSON status for deploy smoke checks</span>
          </li>
          <li>
            <Link href="/contact" className="text-accent hover:underline">
              Contact &amp; pilot info
            </Link>
            <span className="text-muted"> — guided onboarding requests</span>
          </li>
        </ul>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/dashboard/restaurants" className="btn-primary min-h-11 justify-center px-5">
          Open restaurants
        </Link>
        <Link href="/contact" className="btn-ghost min-h-11 justify-center px-5">
          Contact support
        </Link>
      </div>
    </div>
  );
}
