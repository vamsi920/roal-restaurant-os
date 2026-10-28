import Link from "next/link";
import {
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
      "Upload a flat, well-lit photo of one menu page at a time, or a PDF.",
      "Check the preview before saving; if categories look off, discard and upload again.",
      `Fix single items on ${RESTAURANT_MENU_AGENT_LABEL}. Clear the whole menu only when starting fresh.`,
    ],
  },
  {
    title: "My host got an item or price wrong",
    icon: Headphones,
    color: "blue",
    steps: [
      `Fix the item on ${RESTAURANT_MENU_AGENT_LABEL} and save. Your host gets the change automatically.`,
      "Make a test call from Phone host to hear the update.",
      "Still wrong? Email us and we'll look at the call with you.",
    ],
  },
  {
    title: "New orders aren't showing up",
    icon: Radio,
    color: "amber",
    steps: [
      "Orders refresh on their own every few seconds; keep the Kitchen page open.",
      "Check the tablet or computer is online, then reload the page.",
      "Still missing? Email us the time of the call and we'll find it.",
    ],
  },
  {
    title: "Stuck or missing kitchen orders",
    icon: ChefHat,
    color: "rose",
    steps: [
      `Use Refresh on ${RESTAURANT_LIVE_ORDERS_LABEL} and check the New, Preparing, Ready and Done tabs.`,
      "Accept new tickets so the kitchen knows they are being made.",
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
            detail="Completed orders, setup problems, stuck orders"
            icon={Bell}
            color="amber"
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
