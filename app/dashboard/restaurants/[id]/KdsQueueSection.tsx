import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type KdsLaneTone = "new" | "preparing" | "ready" | "done";

const TONE_DOT: Record<KdsLaneTone, string> = {
  new: "bg-[rgb(var(--tile-blue-ink))]",
  preparing: "bg-warning",
  ready: "bg-success",
  done: "bg-subtle",
};

/**
 * One lane of the Kitchen board (New / Preparing / Ready). On a narrow column only
 * the active lane shows; from 720px of board width all three sit side by side
 * (see .kds-board in kds-workspace.css).
 */
export function KdsQueueSection({
  id,
  title,
  count,
  tone,
  active = true,
  emptyTitle,
  emptyBody,
  children,
}: {
  id: string;
  title: string;
  count: number;
  tone: KdsLaneTone;
  /** Shown on narrow boards; ignored once lanes sit side by side. */
  active?: boolean;
  emptyTitle: string;
  emptyBody?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section
      id={id}
      className="kds-board__lane"
      data-active={active ? "true" : "false"}
      aria-labelledby={`${id}-heading`}
    >
      <header className="kds-lane__head">
        <h3
          id={`${id}-heading`}
          className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted"
        >
          <span className={cn("h-2 w-2 rounded-full", TONE_DOT[tone])} aria-hidden />
          {title}
        </h3>
        <span className="kds-lane__count" aria-label={`${count} ticket${count === 1 ? "" : "s"}`}>
          {count}
        </span>
      </header>
      {count === 0 ? (
        <div className="kds-lane__empty" role="status">
          <p className="font-semibold text-muted">{emptyTitle}</p>
          {emptyBody ? <p className="text-[12.5px] text-subtle">{emptyBody}</p> : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">{children}</ul>
      )}
    </section>
  );
}
