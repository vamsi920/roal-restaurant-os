import Link from "next/link";
import { PageHeader, Panel } from "@/components/dashboard/page-primitives";
import {
  RESTAURANT_LIVE_ORDERS_LABEL,
  RESTAURANT_MENU_AGENT_LABEL,
} from "@/lib/dashboard-restaurant-labels";
import { CONTACT_PILOT_EMAIL, buildPilotMailto } from "@/lib/landing/contact-mailto";

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
    title: "Phone host not syncing orders",
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
      `Use Refresh on ${RESTAURANT_LIVE_ORDERS_LABEL}; check Incoming vs Kitchen vs Done tabs.`,
      "Accept new orders from the queue before they time out.",
      "See notification settings for stuck-order alerts.",
    ],
  },
] as const;

export function SupportHub() {
  const mailto = buildPilotMailto({ subject: "ROAL support" });

  return (
    <div className="support-hub dashboard-page dashboard-page--medium min-w-0 space-y-5 overflow-x-hidden">
      <PageHeader
        title="Support"
        lead="Quick fixes for setup and service. For pilot onboarding or billing, email us."
        actions={
          <a href={mailto} className="btn-primary">
            Email {CONTACT_PILOT_EMAIL}
          </a>
        }
      />

      <div className="support-hub__cards grid min-w-0 gap-3 sm:grid-cols-2">
        {RUNBOOKS.map((rb) => (
          <Panel key={rb.title} className="support-hub__card" title={rb.title}>
            <ol className="mt-2.5 list-decimal space-y-1.5 pl-4 text-[13px] leading-relaxed text-muted">
              {rb.steps.map((step) => (
                <li key={step} className="text-pretty [overflow-wrap:anywhere]">
                  {step}
                </li>
              ))}
            </ol>
          </Panel>
        ))}
      </div>

      <Panel title="More" muted>
        <ul className="mt-2.5 grid gap-1.5 text-[13px] sm:grid-cols-2">
          <ResourceLink href="/dashboard/onboarding" label="Go live checklist" detail="Real status per location" />
          <ResourceLink
            href="/dashboard/settings/notifications"
            label="Notifications"
            detail="Order complete, sync fail, stuck orders"
          />
          <ResourceLink href="/api/health" label="Platform health" detail="JSON status for deploy checks" />
          <ResourceLink href="/contact" label="Contact" detail="Pilot and billing questions" />
        </ul>
      </Panel>
    </div>
  );
}

function ResourceLink({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-11 flex-col justify-center rounded-md px-2 py-1.5 hover:bg-card lg:min-h-9"
      >
        <span className="font-medium text-ink">{label}</span>
        <span className="text-[12px] text-muted">{detail}</span>
      </Link>
    </li>
  );
}
