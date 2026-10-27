import Link from "next/link";
import { ArrowRight, PhoneCall, PhoneIncoming, ShoppingBag, TriangleAlert } from "lucide-react";
import { Badge, EmptyState, IconTile, Panel, formatRelative } from "@/components/ui";
import type { OverviewActivityItem } from "@/lib/overview/types";

const KIND_ICON = {
  live: { icon: PhoneIncoming, color: "amber" },
  order: { icon: ShoppingBag, color: "green" },
  followup: { icon: TriangleAlert, color: "rose" },
  call: { icon: PhoneCall, color: "blue" },
} as const;

function RightSide({ item, now }: { item: OverviewActivityItem; now: number }) {
  if (item.kind === "live") return <Badge tone="live">Live</Badge>;
  if (item.kind === "order") {
    return (
      <span className="flex items-center gap-2">
        {item.amountLabel ? (
          <span className="text-[13px] font-semibold tabular-nums text-ink">{item.amountLabel}</span>
        ) : null}
        <Badge tone="ok">Confirmed</Badge>
      </span>
    );
  }
  if (item.kind === "followup") {
    return <Badge tone="warn">Call back</Badge>;
  }
  return <span className="whitespace-nowrap text-[12px] text-subtle">{formatRelative(item.occurredAt, now)}</span>;
}

export function RecentActivity({
  items,
  callsHref,
  now,
}: {
  items: OverviewActivityItem[];
  callsHref: string;
  now: number;
}) {
  return (
    <Panel
      title="Recent activity"
      flush
      className="flex min-w-0 flex-col"
      bodyClassName="flex flex-1 flex-col"
      action={
        <Link
          href={callsHref}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-subtle hover:text-ink"
        >
          View all calls <ArrowRight size={14} aria-hidden />
        </Link>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={PhoneCall}
          title="No calls yet this week"
          body="When your host answers a call, it shows up here as it happens."
        />
      ) : (
        <ul className="m-0 list-none p-0" role="list">
          {items.map((item) => {
            const meta = KIND_ICON[item.kind];
            return (
              <li key={`${item.kind}-${item.id}`}>
                <Link href={callsHref} className="list-row min-h-[3.25rem] text-inherit no-underline">
                  <IconTile icon={meta.icon} color={meta.color} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium tabular-nums text-ink">
                      {item.title}
                    </span>
                    <span className="block truncate text-[12px] text-subtle">
                      {item.kind === "followup" && item.reason ? item.reason : item.subtitle}
                      {item.kind !== "call" ? ` · ${formatRelative(item.occurredAt, now)}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0">
                    <RightSide item={item} now={now} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
