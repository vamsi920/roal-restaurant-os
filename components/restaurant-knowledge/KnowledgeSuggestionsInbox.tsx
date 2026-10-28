"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { KnowledgeSuggestion } from "@/lib/knowledge-suggestions/helpers";
import { knowledgeCategoryLabel } from "@/lib/restaurant-knowledge/category-options";
import {
  acceptKnowledgeSuggestionAction,
  dismissKnowledgeSuggestionAction,
} from "@/app/dashboard/restaurants/[id]/knowledge-suggestion-actions";
import { cn } from "@/lib/cn";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  MapPin,
  MessageCircleQuestion,
  PhoneForwarded,
  ScrollText,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Badge, EmptyState, IconTile, formatRelative } from "@/components/ui";
import { Notice } from "@/components/live-orders/workspace-ui";

type Props = {
  restaurantId: string;
  hostName: string;
  suggestions: KnowledgeSuggestion[];
};

type Draft = { question: string; answer: string };

export function KnowledgeSuggestionsInbox({ restaurantId, hostName, suggestions }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(suggestions);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      suggestions.map((s) => [
        s.id,
        { question: s.suggested_question, answer: s.suggested_answer ?? "" },
      ])
    )
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function draftFor(s: KnowledgeSuggestion): Draft {
    return drafts[s.id] ?? { question: s.suggested_question, answer: s.suggested_answer ?? "" };
  }

  function setDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { question: "", answer: "" }), ...patch } }));
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((s) => s.id !== id));
  }

  function accept(s: KnowledgeSuggestion) {
    const d = draftFor(s);
    setBusyId(s.id);
    setErrors((e) => ({ ...e, [s.id]: "" }));
    startTransition(async () => {
      try {
        await acceptKnowledgeSuggestionAction(restaurantId, {
          suggestionId: s.id,
          question: d.question,
          answer: d.answer,
          category: s.category,
        });
        remove(s.id);
        router.refresh();
      } catch (e) {
        setErrors((prev) => ({
          ...prev,
          [s.id]: e instanceof Error ? e.message : "Could not add this answer.",
        }));
      } finally {
        setBusyId(null);
      }
    });
  }

  function dismiss(s: KnowledgeSuggestion) {
    setBusyId(s.id);
    setErrors((e) => ({ ...e, [s.id]: "" }));
    startTransition(async () => {
      try {
        await dismissKnowledgeSuggestionAction(restaurantId, s.id);
        remove(s.id);
        router.refresh();
      } catch (e) {
        setErrors((prev) => ({
          ...prev,
          [s.id]: e instanceof Error ? e.message : "Could not dismiss.",
        }));
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <section
      id="suggestions"
      className="panel min-w-0 scroll-mt-24"
      aria-labelledby="knowledge-inbox-title"
    >
      <div className="panel__head">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile icon={MessageCircleQuestion} color="amber" />
          <div className="min-w-0">
            <h2 id="knowledge-inbox-title" className="panel__title">
              Questions {hostName} couldn&apos;t answer
            </h2>
            <p className="text-[12.5px] text-subtle">
              From real calls. Add an answer and your host will use it from the next call.
            </p>
          </div>
        </div>
        {items.length > 0 ? (
          <Badge tone="warn" title={`${items.length} waiting for an answer`}>
            {items.length} to answer
          </Badge>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing to answer"
          body={`${hostName} handled every question so far. New ones from real calls show up here.`}
        />
      ) : (
        <ul className="min-w-0" aria-label="Unanswered caller questions">
          {items.map((s) => {
            const d = draftFor(s);
            const busy = busyId === s.id && pending;
            const err = errors[s.id];
            const isOpen = openId === s.id;
            const when = formatRelative(s.updated_at || s.created_at);
            return (
              <li key={s.id} className="border-b border-line/70 last:border-b-0">
                <div className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-[1.125rem]">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <IconTile icon={CATEGORY_ICON[s.category] ?? HelpCircle} color="orange" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium text-ink [overflow-wrap:anywhere]">
                        “{s.caller_question}”
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-subtle">
                        {knowledgeCategoryLabel(s.category)} · Asked {s.times_asked} time
                        {s.times_asked === 1 ? "" : "s"}
                        {when ? ` · ${when}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 max-sm:pl-11">
                    <button
                      type="button"
                      className={cn(isOpen ? "btn-ghost btn-sm" : "btn-primary btn-sm")}
                      aria-expanded={isOpen}
                      aria-controls={`suggestion-form-${s.id}`}
                      disabled={busy}
                      onClick={() => setOpenId(isOpen ? null : s.id)}
                    >
                      {isOpen ? "Close" : "Answer"}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      disabled={busy}
                      aria-label={`Dismiss “${s.caller_question}”`}
                      onClick={() => dismiss(s)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>

                {err && !isOpen ? (
                  <div className="px-4 pb-3 sm:px-[1.125rem]">
                    <Notice tone="bad">{err}</Notice>
                  </div>
                ) : null}

                {isOpen ? (
                  <div
                    id={`suggestion-form-${s.id}`}
                    className="space-y-3 border-t border-line/70 bg-elev px-4 py-4 sm:px-[1.125rem]"
                  >
                    <div className="min-w-0">
                      <label htmlFor={`sq-${s.id}`} className="field-label">
                        Question
                      </label>
                      <input
                        id={`sq-${s.id}`}
                        className="input-base max-sm:h-11"
                        value={d.question}
                        maxLength={220}
                        disabled={busy}
                        onChange={(e) => setDraft(s.id, { question: e.target.value })}
                      />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor={`sa-${s.id}`} className="field-label">
                        Answer
                      </label>
                      <textarea
                        id={`sa-${s.id}`}
                        className="input-base"
                        rows={3}
                        maxLength={1200}
                        placeholder={`What should ${hostName} say next time?`}
                        value={d.answer}
                        disabled={busy}
                        onChange={(e) => setDraft(s.id, { answer: e.target.value })}
                      />
                    </div>
                    {err ? <Notice tone="bad">{err}</Notice> : null}
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        className="btn-primary max-sm:w-full"
                        disabled={busy || !d.answer.trim() || !d.question.trim()}
                        aria-busy={busy}
                        onClick={() => accept(s)}
                      >
                        {busy ? "Saving…" : `Teach ${hostName}`}
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const CATEGORY_ICON: Record<KnowledgeSuggestion["category"], LucideIcon> = {
  general: HelpCircle,
  hours: Clock,
  menu: UtensilsCrossed,
  allergens: AlertTriangle,
  directions: MapPin,
  policies: ScrollText,
  handoff: PhoneForwarded,
};
