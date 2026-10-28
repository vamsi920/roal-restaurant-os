import Link from "next/link";
import { ArrowRight, Check, CircleAlert, Loader2, Rocket } from "lucide-react";
import { IconTile } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { OverviewLaunch } from "@/lib/overview/types";

/** Compact "Go live" checklist shown on the Overview until the location is live. */
export function GoLiveCard({ launch }: { launch: OverviewLaunch }) {
  const percent = launch.totalCount > 0 ? Math.round((launch.completedCount / launch.totalCount) * 100) : 0;
  // Highlight the next step the owner can do; automatic steps fill themselves in.
  const nextIndex = launch.items.findIndex((item) => item.status !== "ok" && !item.automatic);
  // Once the host is set up it already answers calls; what's left only makes its answers complete.
  const hostAnswering = launch.items.some((item) => item.automatic && item.status === "ok");

  return (
    <section id="go-live" className="panel scroll-mt-20 overflow-hidden" aria-labelledby="go-live-title">
      <div className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
        <IconTile icon={Rocket} color="orange" size="lg" />
        <div className="min-w-0 flex-1">
          <h2 id="go-live-title" className="text-[15px] font-semibold text-ink">
            {hostAnswering ? "Finish setup" : "Go live"}
          </h2>
          <p className="mt-0.5 text-[13px] text-subtle">
            {launch.completedCount} of {launch.totalCount} done.{" "}
            {hostAnswering
              ? "Your host already answers calls. Finish these so it can tell callers everything they ask."
              : "Finish these and your host starts answering your calls."}
          </p>
          <div
            className="mt-3 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-elev"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Go-live progress"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </div>
        </div>
        {launch.primaryAction ? (
          <Link href={launch.primaryAction.href} className="btn-primary btn-sm shrink-0">
            {launch.primaryAction.label}
          </Link>
        ) : null}
      </div>
      <ol className="m-0 grid list-none gap-px border-t border-line bg-line p-0 sm:grid-cols-2">
        {launch.items.map((item, index) => {
          const done = item.status === "ok";
          const error = item.status === "error";
          const working = !done && Boolean(item.automatic);
          return (
            <li key={item.id} className="min-w-0 bg-card">
              <Link
                href={item.href}
                className={cn(
                  "group flex min-h-11 items-center gap-2.5 px-4 py-2.5 text-[13px] hover:bg-elev sm:px-5",
                  index === nextIndex && "bg-accent-soft/40"
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                    done && "border-success bg-success text-white",
                    error && "border-danger/40 bg-danger/10 text-danger",
                    working && "border-transparent text-accent",
                    !done && !error && !working && "border-line-strong bg-card text-transparent"
                  )}
                  aria-hidden
                >
                  {done ? (
                    <Check size={12} strokeWidth={3} />
                  ) : working ? (
                    <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
                  ) : error ? (
                    <CircleAlert size={12} />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate font-medium", done ? "text-subtle line-through decoration-line-strong" : "text-ink")}>
                    {item.label}
                  </span>
                  {!done && item.detail ? (
                    <span className="block truncate text-[12px] text-subtle">{item.detail}</span>
                  ) : null}
                </span>
                <span className="sr-only">{done ? "Done" : working ? "Setting up for you" : error ? "Needs attention" : "To do"}</span>
                {!done ? (
                  <ArrowRight size={14} className="shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
