"use client";

import type { ModifierGroupInput } from "@/lib/menu-editor/modifier-group-schema";
import type { ModifierGroupView } from "@/lib/menu-editor/modifier-groups";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

function parseSortOrderInput(raw: string, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function parseMaxSelectionInput(
  raw: string,
  fallback: number,
  min: number,
  maxCap: number
): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(maxCap, Math.max(min, n));
}

type Props = {
  draft: ModifierGroupInput;
  pending: boolean;
  isNew: boolean;
  duplicateHint: string | null;
  fieldErrors: Record<string, string>;
  onChange: (d: ModifierGroupInput) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => void;
};

function FieldHint({
  error,
  warning,
}: {
  error?: string;
  warning?: string | null;
}) {
  if (error) {
    return (
      <p className="mt-1 text-[12px] text-danger" role="alert">
        {error}
      </p>
    );
  }
  if (warning) {
    return <p className="mt-1 text-[12px] text-warning">{warning}</p>;
  }
  return null;
}

function formatExtra(price: number): string | null {
  return price > 0 ? `+$${price.toFixed(2)}` : null;
}

export function ModifierGroupList({
  groups,
  pending,
  onEdit,
  onAdd,
}: {
  groups: ModifierGroupView[];
  pending: boolean;
  onEdit: (group: ModifierGroupView) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-ink">
          Modifier groups{" "}
          <span className="font-normal tabular-nums text-subtle">{groups.length}</span>
        </h3>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={pending}
          onClick={onAdd}
        >
          <Plus size={14} aria-hidden /> Add group
        </button>
      </div>
      {groups.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line px-3 py-4 text-center text-[12.5px] text-subtle">
          No modifier groups yet. Add sizes, toppings, or spice levels the phone host
          should ask about.
        </p>
      ) : (
        <ul className="divide-y divide-line/70 rounded-[10px] border border-line bg-card">
          {groups.map((group) => (
            <li
              key={`${group.item_id}-${group.group_name}`}
              className="flex min-w-0 items-start justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <p className="truncate text-[13.5px] font-medium text-ink">{group.group_name}</p>
                  <Badge tone={group.is_required ? "info" : "neutral"}>
                    {group.is_required ? "Required" : "Optional"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[12px] text-subtle">
                  Pick {group.min_selection}–{group.max_selection} ·{" "}
                  {group.options.map((opt) => {
                    const extra = formatExtra(opt.extra_price);
                    return extra ? `${opt.modifier_name} (${extra})` : opt.modifier_name;
                  }).join(", ")}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost btn-sm shrink-0"
                disabled={pending}
                aria-label={`Edit ${group.group_name}`}
                onClick={() => onEdit(group)}
              >
                <Pencil size={13} aria-hidden /> Edit
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ModifierGroupEditor({
  draft,
  pending,
  isNew,
  duplicateHint,
  fieldErrors,
  onChange,
  onCancel,
  onSave,
  onDelete,
}: Props) {
  const maxCap = Math.max(1, draft.options.length);

  function updateOption(
    index: number,
    patch: Partial<ModifierGroupInput["options"][number]>
  ) {
    const options = draft.options.map((opt, i) =>
      i === index ? { ...opt, ...patch } : opt
    );
    onChange({ ...draft, options });
  }

  function addOption() {
    onChange({
      ...draft,
      options: [
        ...draft.options,
        {
          modifier_name: "",
          extra_price: 0,
          sort_order: draft.options.length + 1,
        },
      ],
      max_selection: Math.min(draft.max_selection + 1, draft.options.length + 1),
    });
  }

  function removeOption(index: number) {
    if (draft.options.length <= 1) return;
    const options = draft.options.filter((_, i) => i !== index);
    onChange({
      ...draft,
      options,
      max_selection: Math.min(draft.max_selection, options.length),
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <p className="text-[13px] font-semibold text-ink">
        {isNew ? "New modifier group" : "Edit modifier group"}
      </p>

      <label className="block">
        <span className="field-label">Group name</span>
        <input
          className="input-base"
          value={draft.group_name}
          required
          disabled={pending}
          placeholder="Size, Toppings, Spice level…"
          onChange={(e) => onChange({ ...draft, group_name: e.target.value })}
        />
        <FieldHint
          error={fieldErrors.group_name ?? duplicateHint ?? undefined}
        />
      </label>

      <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-[13.5px] text-ink lg:min-h-0">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
          checked={draft.is_required}
          disabled={pending}
          onChange={(e) => {
            const required = e.target.checked;
            onChange({
              ...draft,
              is_required: required,
              max_selection: required
                ? Math.max(1, draft.max_selection)
                : draft.max_selection,
            });
          }}
        />
        <span>
          Required group
          <span className="block text-[12px] text-subtle">
            Guest must pick at least one option.
          </span>
          <FieldHint error={fieldErrors.is_required} />
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="field-label">Max selections</span>
          <input
            type="number"
            min={draft.is_required ? 1 : 0}
            max={maxCap}
            className="input-base tabular-nums"
            value={draft.max_selection}
            disabled={pending}
            onChange={(e) =>
              onChange({
                ...draft,
                max_selection: parseMaxSelectionInput(
                  e.target.value,
                  draft.max_selection,
                  draft.is_required ? 1 : 0,
                  maxCap
                ),
              })
            }
          />
          <FieldHint error={fieldErrors.max_selection} />
          <p className="mt-1 text-[12px] text-subtle">
            Up to {maxCap} (number of options)
          </p>
        </label>
        <label className="block">
          <span className="field-label">Group order</span>
          <input
            type="number"
            min={0}
            className="input-base tabular-nums"
            value={draft.group_sort_order ?? 1}
            disabled={pending}
            onChange={(e) =>
              onChange({
                ...draft,
                group_sort_order: parseSortOrderInput(
                  e.target.value,
                  draft.group_sort_order ?? 1
                ),
              })
            }
          />
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-ink">Options</span>
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={pending}
            onClick={addOption}
          >
            <Plus size={14} aria-hidden /> Add option
          </button>
        </div>
        <ul className="mt-2 space-y-2">
          {draft.options.map((opt, idx) => (
            <li
              key={opt.id ?? `new-${idx}`}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_6.5rem_auto] items-end gap-2"
              )}
            >
              <label className="block min-w-0">
                <span className={cn("field-label", idx > 0 && "sr-only")}>Option name</span>
                <input
                  className="input-base"
                  value={opt.modifier_name}
                  required
                  disabled={pending}
                  aria-label={idx > 0 ? `Option ${idx + 1} name` : undefined}
                  onChange={(e) =>
                    updateOption(idx, { modifier_name: e.target.value })
                  }
                />
                <FieldHint error={fieldErrors[`options.${idx}.modifier_name`]} />
              </label>
              <label className="block min-w-0">
                <span className={cn("field-label", idx > 0 && "sr-only")}>Extra price</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  inputMode="decimal"
                  className="input-base tabular-nums"
                  value={opt.extra_price}
                  disabled={pending}
                  aria-label={idx > 0 ? `Option ${idx + 1} extra price` : undefined}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      updateOption(idx, { extra_price: 0 });
                      return;
                    }
                    const n = Number(raw);
                    if (Number.isFinite(n)) {
                      updateOption(idx, { extra_price: n });
                    }
                  }}
                />
              </label>
              <button
                type="button"
                className="btn-ghost w-9 px-0 text-subtle hover:text-danger"
                aria-label={`Remove option ${idx + 1}`}
                disabled={pending || draft.options.length <= 1}
                onClick={() => removeOption(idx)}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <FieldHint error={fieldErrors.options} />
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending}>
          {pending ? "Saving…" : isNew ? "Create group" : "Save group"}
        </button>
        <button
          type="button"
          className="btn-ghost w-full sm:w-auto"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </button>
        {onDelete ? (
          <button
            type="button"
            className="btn-danger w-full sm:ml-auto sm:w-auto"
            disabled={pending}
            onClick={onDelete}
          >
            Delete group
          </button>
        ) : null}
      </div>
    </form>
  );
}
