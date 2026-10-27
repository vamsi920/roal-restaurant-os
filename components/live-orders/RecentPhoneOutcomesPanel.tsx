import Link from "next/link";
import { PhoneForwarded, PhoneMissed, PhoneOff, Voicemail } from "lucide-react";
import { Badge, EmptyState, IconTile, Panel, formatRelative, type TileColor, type Tone } from "@/components/ui";
import type { LiveOrdersRecentOutcome } from "@/lib/live-orders/build-recent-outcomes";
import {
  kdsPeakCallContextCopy,
  type KdsPeakCallContext,
} from "@/lib/live-orders/peak-call-context";

function formatWhen(iso: string): string {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(ms);
}

const KIND: Record<
  LiveOrdersRecentOutcome["kind"],
  { label: string; tone: Tone; tile: TileColor; icon: typeof PhoneMissed }
> = {
  failed: { label: "Failed", tone: "bad", tile: "rose", icon: PhoneOff },
  handoff: { label: "Handoff", tone: "warn", tile: "amber", icon: PhoneForwarded },
  voicemail: { label: "Voicemail", tone: "info", tile: "blue", icon: Voicemail },
  unknown: { label: "Unclear", tone: "neutral", tile: "orange", icon: PhoneMissed },
};

/** Failed calls, handoffs, voicemail and unclear endings from the last 48 hours. */
export function RecentPhoneOutcomesPanel({
  outcomes,
  rangeSince,
  rangeUntil,
  empty,
  peakCallContext,
  actionNeededCount = 0,
  callsHref,
}: {
  outcomes: LiveOrdersRecentOutcome[];
  rangeSince: string;
  rangeUntil: string;
  empty: boolean;
  peakCallContext: KdsPeakCallContext;
  actionNeededCount?: number;
  callsHref: string;
}) {
  return (
    <Panel
      flush
      title="Recent outcomes"
      action={
        actionNeededCount > 0 ? (
          <Link href={callsHref} className="btn-ghost btn-sm">
            {actionNeededCount} need follow-up
          </Link>
        ) : null
      }
    >
      <div className="border-b border-line px-[1.125rem] py-2.5 text-[12.5px]" aria-label="Peak call hour from recorded calls">
        <span className="font-semibold text-ink">Peak call hour</span>{" "}
        <span className="text-muted">{kdsPeakCallContextCopy(peakCallContext)}</span>
      </div>
      {empty ? (
        <EmptyState icon={PhoneMissed} title="No recent outcomes" body="Nothing to review in the last 48 hours." />
      ) : (
        <ul>
          {outcomes.map((row) => {
            const kind = KIND[row.kind];
            return (
              <li key={`${row.kind}-${row.sessionId}`} className="list-row">
                <IconTile icon={kind.icon} color={kind.tile} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">
                    {row.callerPhone?.trim() || "Unknown caller"}
                  </p>
                  <p className="truncate text-[12.5px] text-subtle">
                    {row.headline}
                    {row.detail ? ` · ${row.detail}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={kind.tone}>{kind.label}</Badge>
                  <time className="text-[12px] text-subtle" dateTime={row.occurredAt}>
                    {formatRelative(row.occurredAt)}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="border-t border-line px-[1.125rem] py-2 text-[12px] text-subtle">
        {formatWhen(rangeSince)} – {formatWhen(rangeUntil)}
      </p>
    </Panel>
  );
}
