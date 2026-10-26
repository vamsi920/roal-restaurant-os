"use client";

import { cn } from "@/lib/cn";
import { scorecardProgress, TRIAL_SCORECARD_ITEMS } from "@/lib/trial/scorecard";
import type { TrialScorecard } from "@/lib/trial/types";

/** Guided test checklist that ticks itself from the live transcript. */
export function TrialScorecardPanel({ scorecard, compact = false }: { scorecard: TrialScorecard; compact?: boolean }) {
  const { done, total } = scorecardProgress(scorecard);
  return (
    <div className={cn("trial-scorecard", compact && "trial-scorecard--compact")}>
      <div className="trial-scorecard__head">
        <p className="trial-scorecard__title">Things to try on the call</p>
        <p className="trial-scorecard__count tabular-nums">
          {done}/{total}
        </p>
      </div>
      <ol className="trial-scorecard__list">
        {TRIAL_SCORECARD_ITEMS.map((item) => {
          const ok = Boolean(scorecard[item.id]);
          return (
            <li key={item.id} className={cn("trial-scorecard__item", ok && "is-done")}>
              <span className="trial-scorecard__check" aria-hidden="true">
                {ok ? (
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4 4L19 7" /></svg>
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="trial-scorecard__label">{item.label}</span>
                {!ok && !compact ? <span className="trial-scorecard__hint">{item.hint}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
