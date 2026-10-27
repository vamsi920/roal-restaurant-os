import Link from "next/link";
import {
  Activity,
  Bell,
  ChefHat,
  ChevronRight,
  Headphones,
  Mail,
  MessageCircle,
  Radio,
  Rocket,
  ScanLine,
  type LucideIcon,
} from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/page-primitives";
import { IconTile, type TileColor } from "@/components/ui";
import {
  RESTAURANT_LIVE_ORDERS_LABEL,
  RESTAURANT_MENU_AGENT_LABEL,
} from "@/lib/dashboard-restaurant-labels";
import { CONTACT_PILOT_EMAIL, buildPilotMailto } from "@/lib/landing/contact-mailto";

const RUNBOOKS = [
  {
    title: "Menu scan failed or looks wrong",
    icon: ScanLine,
    color: "orange",
    steps: [
      "Re-upload a flat, well-lit photo of one menu page at a time.",
      "Review the import preview before committing; discard and rescan if categories are off.",
      `Use ${RESTAURANT_MENU_AGENT_LABEL} for quick fixes; clear menu only when starting fresh.`,
    ],
  },
  {
    title: "Phone host not syncing orders",
    icon: Headphones,
    color: "blue",
    steps: [
      `Open ${RESTAURANT_MENU_AGENT_LABEL} → Connect or Re-sync agent.`,
      "Confirm Edge Functions are deployed and AGENT_TOOL_SIGNING_SECRET matches your host.",
      "Run the on-page test harness (get_menu → sync_draft → finalize).",
    ],
  },
  {
    title: "Realtime degraded on Live orders",
    icon: Radio,
    color: "amber",
    steps: [
      "Orders still refresh every 6 seconds while polling.",
      "Check Supabase Realtime publication includes draft_orders and phone_order_receipts.",
      "Verify firewall allows wss://<project>.supabase.co/realtime/v1.",
    ],
  },
  {
    title: "Stuck or missing kitchen orders",
    icon: ChefHat,
    color: "rose",
    steps: [
      `Use Refresh on ${RESTAURANT_LIVE_ORDERS_LABEL}; check Incoming vs Kitchen vs Done tabs.`,
      "Accept new orders from the queue before they time out.",
      "See notification settings for stuck-order alerts.",
    ],
  },
] as const satisfies ReadonlyArray<{
  title: string;
  icon: LucideIcon;
  color: TileColor;
  steps: readonly string[];
}>;

export function SupportHub() {
  const mailto = buildPilotMailto({ subject: "ROAL support" });

  return (
    <div className="support-hub org-page org-page--medium min-w-0 space-y-5 overflow-x-hidden">
      <PageHeader
        title="Support"
        lead="Quick fixes for setup and service. For pilot onboarding or billing, email us."
        actions={
          <a href={mailto} className="btn-primary max-w-full">
            <Mail size={15} strokeWidth={2} aria-hidden />
            <span className="truncate">Email {CONTACT_PILOT_EMAIL}</span>
          </a>
        }
      />

      <div className="support-hub__cards grid min-w-0 gap-3 sm:grid-cols-2">
        {RUNBOOKS.map((rb) => (
          <section key={rb.title} className="support-hub__card panel min-w-0 p-[1.125rem]">
            <div className="flex min-w-0 items-center gap-3">
              <IconTile icon={rb.icon} color={rb.color} />
              <h2 className="panel__title min-w-0">{rb.title}</h2>
            </div>
            <ol className="org-steps mt-3.5">
              {rb.steps.map((step) => (
                <li key={step} className="text-pretty">
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <Panel title="More help" flush>
        <ul className="grid min-w-0 gap-px overflow-hidden rounded-b-[14px] bg-line sm:grid-cols-2">
          <ResourceLink
            href="/dashboard/onboarding"
            label="Go live checklist"
            detail="Real status per location"
            icon={Rocket}
            color="green"
          />
          <ResourceLink
            href="/dashboard/settings/notifications"
            label="Notifications"
            detail="Order complete, sync fail, stuck orders"
            icon={Bell}
            color="amber"
          />
          <ResourceLink
            href="/api/health"
            label="Platform health"
            detail="JSON status for deploy checks"
            icon={Activity}
            color="blue"
          />
          <ResourceLink
            href="/contact"
            label="Contact"
            detail="Pilot and billing questions"
            icon={MessageCircle}
            color="orange"
          />
        </ul>
      </Panel>
    </div>
  );
}

function ResourceLink({
  href,
  label,
  detail,
  icon,
  color,
}: {
  href: string;
  label: string;
  detail: string;
  icon: LucideIcon;
  color: TileColor;
}) {
  return (
    <li className="min-w-0 bg-card">
      <Link
        href={href}
        className="org-link flex min-h-11 min-w-0 items-center gap-3 px-[1.125rem] py-3 text-[13px] hover:bg-elev"
      >
        <IconTile icon={icon} color={color} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink">{label}</span>
          <span className="block truncate text-[12.5px] text-subtle">{detail}</span>
        </span>
        <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-subtle" aria-hidden />
      </Link>
    </li>
  );
}
