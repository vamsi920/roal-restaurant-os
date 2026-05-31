"use client";

import {
  auditUpsellRuleAgainstMenu,
  buildMenuUpsellCatalog,
  type MenuUpsellCatalog,
} from "@/lib/restaurant-upsell/menu-binding";
import {
  UPSSELL_RULE_EXAMPLES,
  type RestaurantUpsellFormEntry,
} from "@/lib/restaurant-upsell/schema";
import type { RestaurantMenuSnapshot } from "@/lib/menu-editor/load-menu";
import { cn } from "@/lib/cn";

type Props = {
  entries: RestaurantUpsellFormEntry[];
  menu: Pick<RestaurantMenuSnapshot, "categories" | "items" | "modifiers">;
  onChange: (entries: RestaurantUpsellFormEntry[]) => void;
  disabled?: boolean;
};

function emptyEntry(
  partial?: Partial<RestaurantUpsellFormEntry>
): RestaurantUpsellFormEntry {
  return {
    trigger_text: partial?.trigger_text ?? "",
    offer_text: partial?.offer_text ?? "",
    is_active: partial?.is_active ?? true,
  };
}

function auditBadgeClass(status: ReturnType<typeof auditUpsellRuleAgainstMenu>["status"]) {
  switch (status) {
    case "ready":
      return "border-success/30 bg-success/10 text-success";
    case "inactive":
      return "border-line bg-elev text-muted";
    case "unavailable":
      return "border-warning/30 bg-warning/10 text-warning";
    default:
      return "border-danger/30 bg-danger/10 text-danger";
  }
}

export function RestaurantUpsellEditor({
  entries,
  menu,
  onChange,
  disabled = false,
}: Props) {
  const catalog: MenuUpsellCatalog = buildMenuUpsellCatalog({
    categories: menu.categories,
    items: menu.items,
    modifiers: menu.modifiers,
  });

  function updateEntry(
    index: number,
    patch: Partial<RestaurantUpsellFormEntry>
  ) {
    onChange(
      entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    );
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function moveEntry(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= entries.length) return;
    const next = [...entries];
    const [row] = next.splice(index, 1);
    if (!row) return;
    next.splice(target, 0, row);
    onChange(next);
  }

  function addExample(example: (typeof UPSSELL_RULE_EXAMPLES)[number]) {
    onChange([
      ...entries,
      emptyEntry({
        trigger_text: example.trigger_text,
        offer_text: example.offer_text,
      }),
    ]);
  }

  return (
    <div className="space-y-3" aria-labelledby="upsell-rules-heading">
      <div className="min-w-0">
        <h3 id="upsell-rules-heading" className="text-sm font-semibold text-ink">
          Smart upsell rules
        </h3>
        <p className="mt-1 text-xs text-muted">
          One short add-on offer while the guest is actively ordering. ROAL checks
          your live menu — only available items reach the phone agent. Skip angry,
          rushed, FAQ, reservation, voicemail, callback, handoff, and no-order calls.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-elev px-4 py-4">
          <p className="text-sm font-medium text-ink">
            No upsell rules yet — add one when you have a real menu add-on to offer.
          </p>
          <p className="mt-1 text-xs text-muted">
            Example: when a guest orders biryani, offer mango lassi if it is on your
            menu and in stock.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {UPSSELL_RULE_EXAMPLES.map((example) => (
              <button
                key={example.trigger_text}
                type="button"
                className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-elev disabled:opacity-50"
                disabled={disabled}
                onClick={() => addExample(example)}
              >
                Use example: {example.trigger_text}
              </button>
            ))}
            <button
              type="button"
              className="rounded-md border border-accent/30 bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 disabled:opacity-50"
              disabled={disabled}
              onClick={() => onChange([emptyEntry()])}
            >
              Add blank rule
            </button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry, index) => {
            const audit = auditUpsellRuleAgainstMenu(entry, catalog);
            return (
              <li
                key={`upsell-${index}`}
                className="rounded-xl border border-line bg-surface p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">
                    Rule {index + 1}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        className="rounded border-line"
                        checked={entry.is_active}
                        disabled={disabled}
                        onChange={(e) =>
                          updateEntry(index, { is_active: e.target.checked })
                        }
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      className="text-xs text-muted hover:text-ink disabled:opacity-40"
                      disabled={disabled || index === 0}
                      onClick={() => moveEntry(index, -1)}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      className="text-xs text-muted hover:text-ink disabled:opacity-40"
                      disabled={disabled || index === entries.length - 1}
                      onClick={() => moveEntry(index, 1)}
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      className="text-xs text-danger hover:underline disabled:opacity-40"
                      disabled={disabled}
                      onClick={() => removeEntry(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block min-w-0 space-y-1">
                    <span className="text-xs font-medium text-muted">
                      When guest orders / mentions
                    </span>
                    <input
                      className="input-base w-full min-h-11"
                      value={entry.trigger_text}
                      disabled={disabled}
                      placeholder="Biryani order"
                      onChange={(e) =>
                        updateEntry(index, { trigger_text: e.target.value })
                      }
                    />
                  </label>
                  <label className="block min-w-0 space-y-1">
                    <span className="text-xs font-medium text-muted">
                      Offer this add-on (exact menu name)
                    </span>
                    <input
                      className="input-base w-full min-h-11"
                      value={entry.offer_text}
                      disabled={disabled}
                      placeholder="House salad if available"
                      onChange={(e) =>
                        updateEntry(index, { offer_text: e.target.value })
                      }
                    />
                  </label>
                </div>

                <p
                  className={cn(
                    "mt-3 rounded-md border px-2.5 py-2 text-xs",
                    auditBadgeClass(audit.status)
                  )}
                  role="status"
                >
                  {audit.message}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {entries.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-accent/30 bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 disabled:opacity-50"
            disabled={disabled || entries.length >= 20}
            onClick={() => onChange([...entries, emptyEntry()])}
          >
            Add rule
          </button>
          {UPSSELL_RULE_EXAMPLES.map((example) => (
            <button
              key={example.trigger_text}
              type="button"
              className="rounded-md border border-line bg-elev px-2.5 py-1.5 text-xs text-muted hover:text-ink disabled:opacity-50"
              disabled={disabled || entries.length >= 20}
              onClick={() => addExample(example)}
            >
              Example: {example.trigger_text}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}