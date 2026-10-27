"use client";

import {
  RESTAURANT_KNOWLEDGE_CATEGORY_OPTIONS,
  knowledgeCategoryLabel,
} from "@/lib/restaurant-knowledge/category-options";
import {
  RESTAURANT_KNOWLEDGE_CATEGORIES,
  type RestaurantKnowledgeCategory,
  type RestaurantKnowledgeFormEntry,
} from "@/lib/restaurant-knowledge/schema";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  entries: RestaurantKnowledgeFormEntry[];
  onChange: (entries: RestaurantKnowledgeFormEntry[]) => void;
  disabled?: boolean;
};

function emptyEntry(
  partial?: Partial<RestaurantKnowledgeFormEntry>
): RestaurantKnowledgeFormEntry {
  return {
    category: partial?.category ?? "general",
    question: partial?.question ?? "",
    answer: partial?.answer ?? "",
    is_active: partial?.is_active ?? true,
  };
}

export function RestaurantKnowledgeEditor({
  entries,
  onChange,
  disabled = false,
}: Props) {
  function updateEntry(
    index: number,
    patch: Partial<RestaurantKnowledgeFormEntry>
  ) {
    onChange(
      entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    );
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function addExample(example: (typeof RESTAURANT_KNOWLEDGE_CATEGORY_OPTIONS)[number]) {
    onChange([
      ...entries,
      emptyEntry({
        category: example.value,
        question: example.exampleQuestion,
        answer: example.exampleAnswer,
      }),
    ]);
  }

  const atLimit = entries.length >= 24;
  const activeCount = entries.filter((e) => e.is_active).length;

  return (
    <div className="space-y-3" aria-label="Guest FAQ and business answers">
      <p className="text-[12.5px] text-subtle">
        Answers ROAL can use for hours, parking, allergens, catering, reservations,
        refunds, delivery/pickup, wait time, and complaints. Inactive answers stay
        saved but are not sent to the phone host.
        {entries.length > 0 ? (
          <span className="text-muted">
            {" "}
            {activeCount} of {entries.length} active.
          </span>
        ) : null}
      </p>

      {entries.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-line px-4 py-5 text-center">
          <p className="text-[13.5px] font-medium text-ink">
            No answers yet — the phone host will offer a callback for these questions.
          </p>
          <p className="mt-1 text-[12.5px] text-subtle">
            Start from an example below or add your first answer.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry, index) => (
            <li
              key={`${entry.category}-${entry.question}-${index}`}
              className={cn(
                "rounded-[12px] border border-line p-3 sm:p-4",
                !entry.is_active && "bg-elev/60"
              )}
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                <label className="block min-w-0">
                  <span className="field-label">Category</span>
                  <select
                    className="input-base"
                    value={entry.category}
                    disabled={disabled}
                    onChange={(e) =>
                      updateEntry(index, {
                        category: e.target.value as RestaurantKnowledgeCategory,
                      })
                    }
                  >
                    {RESTAURANT_KNOWLEDGE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {knowledgeCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className="field-label">Guest question</span>
                  <input
                    className="input-base"
                    value={entry.question}
                    disabled={disabled}
                    onChange={(e) =>
                      updateEntry(index, { question: e.target.value })
                    }
                    placeholder="What do guests usually ask?"
                  />
                </label>
                <label className="block min-w-0 sm:col-span-2">
                  <span className="field-label">Approved answer</span>
                  <textarea
                    className="input-base resize-y"
                    rows={3}
                    value={entry.answer}
                    disabled={disabled}
                    onChange={(e) =>
                      updateEntry(index, { answer: e.target.value })
                    }
                    placeholder="What should ROAL say? Use only facts you can stand behind."
                  />
                </label>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[12.5px] font-medium text-muted lg:min-h-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-ink"
                    checked={entry.is_active}
                    disabled={disabled}
                    onChange={(e) =>
                      updateEntry(index, { is_active: e.target.checked })
                    }
                  />
                  Active for phone host
                </label>
                <button
                  type="button"
                  className="btn-ghost btn-sm text-muted hover:text-danger"
                  disabled={disabled}
                  onClick={() => removeEntry(index)}
                >
                  <Trash2 size={13} aria-hidden /> Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 rounded-[12px] bg-elev/60 p-3 sm:flex-row sm:items-start">
        <button
          type="button"
          className="btn-ghost shrink-0"
          disabled={disabled || atLimit}
          onClick={() => onChange([...entries, emptyEntry()])}
        >
          <Plus size={15} aria-hidden /> Add answer
        </button>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-subtle">Or start from an example</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {RESTAURANT_KNOWLEDGE_CATEGORY_OPTIONS.map((example, index) => (
              <button
                key={`${example.value}-${example.exampleQuestion}-${index}`}
                type="button"
                disabled={disabled || atLimit}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-3 text-[12.5px] font-medium text-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50 motion-reduce:transition-none lg:min-h-8"
                onClick={() => addExample(example)}
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {atLimit ? (
        <p className="text-[12px] text-subtle">You can save up to 24 answers.</p>
      ) : null}
    </div>
  );
}
