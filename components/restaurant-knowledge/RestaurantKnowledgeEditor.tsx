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

  return (
    <div className="space-y-3" aria-labelledby="guest-knowledge-heading">
      <div className="min-w-0">
        <h3
          id="guest-knowledge-heading"
          className="text-sm font-semibold text-ink"
        >
          Guest FAQ &amp; business answers
        </h3>
        <p className="mt-1 text-xs text-muted">
          Add answers ROAL can use for hours, parking, allergens, catering,
          reservations, refunds, delivery/pickup, wait time, and complaints.
          Inactive answers stay saved but are not sent to the phone agent.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-elev px-4 py-4">
          <p className="text-sm font-medium text-ink">
            Add answers before ROAL can answer these guest questions.
          </p>
          <p className="mt-1 text-xs text-muted">
            Start from an example below or add your first answer manually.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry, index) => (
            <li
              key={`${entry.category}-${entry.question}-${index}`}
              className={cn(
                "rounded-xl border border-line bg-card p-3 sm:p-4",
                !entry.is_active && "opacity-70"
              )}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-1">
                  <span className="mb-1.5 block text-xs font-medium text-muted">
                    Category
                  </span>
                  <select
                    className="input-base min-h-11 w-full"
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
                <label className="flex items-end sm:col-span-1">
                  <span className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-muted">
                    <input
                      type="checkbox"
                      checked={entry.is_active}
                      disabled={disabled}
                      onChange={(e) =>
                        updateEntry(index, { is_active: e.target.checked })
                      }
                    />
                    Active for phone agent
                  </span>
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-medium text-muted">
                    Guest question
                  </span>
                  <input
                    className="input-base min-h-11 w-full"
                    value={entry.question}
                    disabled={disabled}
                    onChange={(e) =>
                      updateEntry(index, { question: e.target.value })
                    }
                    placeholder="What do guests usually ask?"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-medium text-muted">
                    Approved answer
                  </span>
                  <textarea
                    className="input-base min-h-[5.5rem] w-full resize-y"
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
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="kds-thumb-btn min-h-10 rounded-lg border border-line px-3 text-xs font-semibold text-muted hover:text-danger"
                  disabled={disabled}
                  onClick={() => removeEntry(index)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="kds-thumb-btn min-h-10 rounded-lg border border-accent/30 bg-accent-soft px-3 text-xs font-semibold text-accent"
          disabled={disabled || entries.length >= 24}
          onClick={() => onChange([...entries, emptyEntry()])}
        >
          Add answer
        </button>
      </div>

      <div className="rounded-xl border border-line bg-elev px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
          Example starters
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {RESTAURANT_KNOWLEDGE_CATEGORY_OPTIONS.map((example, index) => (
            <button
              key={`${example.value}-${example.exampleQuestion}-${index}`}
              type="button"
              disabled={disabled || entries.length >= 24}
              className="kds-thumb-btn rounded-lg border border-line bg-card px-2.5 py-1.5 text-[0.68rem] font-medium text-muted hover:text-ink"
              onClick={() => addExample(example)}
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
