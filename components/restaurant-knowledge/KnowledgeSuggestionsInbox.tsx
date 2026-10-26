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
      className="knowledge-inbox card min-w-0"
      aria-labelledby="knowledge-inbox-title"
    >
      <header className="knowledge-inbox__head">
        <div className="min-w-0">
          <h2 id="knowledge-inbox-title" className="knowledge-inbox__title">
            Questions {hostName} couldn&apos;t answer
            {items.length > 0 ? (
              <span className="chip chip--accent ml-2 align-middle">{items.length}</span>
            ) : null}
          </h2>
          <p className="knowledge-inbox__lead">
            Mined from real calls. Accept to teach {hostName} the answer; it goes live on the
            next sync.
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="empty-state m-4 sm:m-5">
          <p className="text-sm font-semibold text-ink">Nothing yet</p>
          <p className="text-sm">
            After real calls, questions your host couldn&apos;t answer show up here.
          </p>
        </div>
      ) : (
        <ul className="knowledge-inbox__list">
          {items.map((s) => {
            const d = draftFor(s);
            const busy = busyId === s.id && pending;
            const err = errors[s.id];
            return (
              <li key={s.id} className="knowledge-inbox__item">
                <div className="knowledge-inbox__meta">
                  <span className="chip">{knowledgeCategoryLabel(s.category)}</span>
                  <span className="knowledge-inbox__asked tabular-nums">
                    Asked {s.times_asked} time{s.times_asked === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="knowledge-inbox__caller">
                  <span className="text-subtle">Caller said:</span> “{s.caller_question}”
                </p>

                <div className="knowledge-inbox__fields">
                  <div className="min-w-0">
                    <label htmlFor={`sq-${s.id}`} className="field-label">
                      Question
                    </label>
                    <input
                      id={`sq-${s.id}`}
                      className="input-base"
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
                      placeholder="What should your host say next time?"
                      value={d.answer}
                      disabled={busy}
                      onChange={(e) => setDraft(s.id, { answer: e.target.value })}
                    />
                  </div>
                </div>

                {err ? (
                  <p className="knowledge-inbox__error" role="alert">
                    {err}
                  </p>
                ) : null}

                <div className="knowledge-inbox__actions">
                  <button
                    type="button"
                    className={cn("btn-primary", busy && "opacity-70")}
                    disabled={busy || !d.answer.trim() || !d.question.trim()}
                    aria-busy={busy}
                    onClick={() => accept(s)}
                  >
                    {busy ? "Saving…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={busy}
                    onClick={() => dismiss(s)}
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
