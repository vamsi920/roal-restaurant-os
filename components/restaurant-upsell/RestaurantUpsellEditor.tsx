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
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Badge, type Tone } from "@/components/ui";
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

function auditTone(status: ReturnType<typeof auditUpsellRuleAgainstMenu>["status"]): Tone {
  switch (status) {
    case "ready":
      return "ok";
    case "inactive":
      return "neutral";
    case "unavailable":
      return "warn";
    default:
      return "bad";
  }
}

function auditLabel(status: ReturnType<typeof auditUpsellRuleAgainstMenu>["status"]): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "inactive":
      return "Off";
    case "unavailable":
      return "Item unavailable";
    default:
      return "Needs fix";
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

  const atLimit = entries.length >= 20;

  return (
    <div className="space-y-3" aria-label="Smart upsell rules">
      <p className="text-[12.5px] text-subtle">
        ROAL checks your live menu — only available items reach the phone host. It
        skips angry, rushed, FAQ, reservation, voicemail, callback, handoff, and
        no-order calls.
      </p>

      {entries.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-line px-4 py-5 text-center">
          <p className="text-[13.5px] font-medium text-ink">
            No upsell rules yet — add one when you have a real add-on to offer.
          </p>
          <p className="mt-1 text-[12.5px] text-subtle">
            Example: when a guest orders biryani, offer mango lassi if it is on your
            menu and in stock.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry, index) => {
            const audit = auditUpsellRuleAgainstMenu(entry, catalog);
            return (
              <li
                key={`upsell-${index}`}
                className={cn(
                  "rounded-[12px] border border-line p-3 sm:p-4",
                  !entry.is_active && "bg-elev/60"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-ink">
                      Rule {index + 1}
                    </span>
                    <Badge tone={auditTone(audit.status)}>{auditLabel(audit.status)}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <label className="mr-1 inline-flex min-h-11 cursor-pointer items-center gap-2 text-[12.5px] text-muted lg:min-h-0">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-ink"
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
                      className="btn-ghost btn-sm w-[1.875rem] px-0"
                      aria-label={`Move rule ${index + 1} up`}
                      disabled={disabled || index === 0}
                      onClick={() => moveEntry(index, -1)}
                    >
                      <ChevronUp size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm w-[1.875rem] px-0"
                      aria-label={`Move rule ${index + 1} down`}
                      disabled={disabled || index === entries.length - 1}
                      onClick={() => moveEntry(index, 1)}
                    >
                      <ChevronDown size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm w-[1.875rem] px-0 text-muted hover:text-danger"
                      aria-label={`Remove rule ${index + 1}`}
                      disabled={disabled}
                      onClick={() => removeEntry(index)}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block min-w-0">
                    <span className="field-label">When guest orders / mentions</span>
                    <input
                      className="input-base"
                      value={entry.trigger_text}
                      disabled={disabled}
                      placeholder="Biryani order"
                      onChange={(e) =>
                        updateEntry(index, { trigger_text: e.target.value })
                      }
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="field-label">Offer this add-on (exact menu name)</span>
                    <input
                      className="input-base"
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
                    "mt-2 text-[12.5px] [overflow-wrap:anywhere]",
                    audit.status === "ready" && "text-success",
                    audit.status === "inactive" && "text-subtle",
                    audit.status === "unavailable" && "text-[rgb(var(--tile-amber-ink))]",
                    audit.status !== "ready" &&
                      audit.status !== "inactive" &&
                      audit.status !== "unavailable" &&
                      "text-danger"
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

      <div className="flex flex-col gap-3 rounded-[12px] bg-elev/60 p-3 sm:flex-row sm:items-start">
        <button
          type="button"
          className="btn-ghost shrink-0"
          disabled={disabled || atLimit}
          onClick={() => onChange([...entries, emptyEntry()])}
        >
          <Plus size={15} aria-hidden /> {entries.length === 0 ? "Add blank rule" : "Add rule"}
        </button>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-subtle">Or start from an example</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {UPSSELL_RULE_EXAMPLES.map((example) => (
              <button
                key={example.trigger_text}
                type="button"
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-3 text-[12.5px] font-medium text-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50 motion-reduce:transition-none lg:min-h-8"
                disabled={disabled || atLimit}
                onClick={() => addExample(example)}
              >
                {example.trigger_text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
