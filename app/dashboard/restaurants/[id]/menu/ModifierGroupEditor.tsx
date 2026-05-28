"use client";

import type { ModifierGroupInput } from "@/lib/menu-editor/modifier-group-schema";
import type { ModifierGroupView } from "@/lib/menu-editor/modifier-groups";
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
    return <p className="mt-1 text-caption text-danger">{error}</p>;
  }
  if (warning) {
    return <p className="mt-1 text-caption text-warning">{warning}</p>;
  }
  return null;
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
        <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">
          Modifier groups
        </h3>
        <button
          type="button"
          className="btn-ghost text-xs"
          disabled={pending}
          onClick={onAdd}
        >
          Add group
        </button>
      </div>
      {groups.length === 0 ? (
        <p className="text-xs text-muted">No modifier groups yet.</p>
      ) : (
        <ul className="space-y-2">
          {groups.map((group) => (
            <li
              key={`${group.item_id}-${group.group_name}`}
              className="rounded-lg border border-line/80 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{group.group_name}</p>
                  <p className="mt-0.5 text-caption text-subtle">
                    {group.is_required ? "Required" : "Optional"} · pick{" "}
                    {group.min_selection}–{group.max_selection} · {group.options.length}{" "}
                    option{group.options.length === 1 ? "" : "s"}
                  </p>
                  <ul className="mt-2 space-y-0.5">
                    {group.options.map((opt) => (
                      <li
                        key={opt.id}
                        className="text-caption text-muted"
                      >
                        {opt.modifier_name}
                        {opt.extra_price > 0
                          ? ` (+$${opt.extra_price.toFixed(2)})`
                          : null}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs text-muted hover:text-ink"
                  disabled={pending}
                  onClick={() => onEdit(group)}
                >
                  Edit
                </button>
              </div>
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
      className="space-y-4 border-t border-line pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-subtle">
        {isNew ? "New modifier group" : "Edit modifier group"}
      </p>

      <label className="block text-xs font-medium text-muted">
        Group name
        <input
          className="input-base mt-1"
          value={draft.group_name}
          required
          disabled={pending}
          onChange={(e) => onChange({ ...draft, group_name: e.target.value })}
        />
        <FieldHint
          error={fieldErrors.group_name ?? duplicateHint ?? undefined}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
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
        Required group (guest must pick at least one option)
        <FieldHint error={fieldErrors.is_required} />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted">
          Max selections
          <input
            type="number"
            min={draft.is_required ? 1 : 0}
            max={maxCap}
            className="input-base mt-1"
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
          <p className="mt-1 text-micro text-subtle">
            Up to {maxCap} (number of options)
          </p>
        </label>
        <label className="block text-xs font-medium text-muted">
          Group order
          <input
            type="number"
            min={0}
            className="input-base mt-1"
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
          <span className="text-xs font-medium text-muted">Options</span>
          <button
            type="button"
            className="btn-ghost text-xs"
            disabled={pending}
            onClick={addOption}
          >
            Add option
          </button>
        </div>
        <ul className="mt-2 space-y-2">
          {draft.options.map((opt, idx) => (
            <li
              key={opt.id ?? `new-${idx}`}
              className={cn(
                "grid gap-2 rounded-lg border border-line/80 p-2 sm:grid-cols-[1fr_100px_auto]"
              )}
            >
              <label className="block text-caption text-muted">
                Name
                <input
                  className="input-base mt-0.5 py-1.5 text-sm"
                  value={opt.modifier_name}
                  required
                  disabled={pending}
                  onChange={(e) =>
                    updateOption(idx, { modifier_name: e.target.value })
                  }
                />
                <FieldHint error={fieldErrors[`options.${idx}.modifier_name`]} />
              </label>
              <label className="block text-caption text-muted">
                Extra price
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className="input-base mt-0.5 py-1.5 text-sm"
                  value={opt.extra_price}
                  disabled={pending}
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
                className="self-end text-xs text-danger hover:underline disabled:opacity-40"
                disabled={pending || draft.options.length <= 1}
                onClick={() => removeOption(idx)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <FieldHint error={fieldErrors.options} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <button type="submit" className="btn-primary text-sm" disabled={pending}>
          {pending ? "Saving…" : isNew ? "Create group" : "Save group"}
        </button>
        <button
          type="button"
          className="btn-ghost text-sm"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </button>
        {onDelete ? (
          <button
            type="button"
            className="btn-ghost ml-auto text-sm text-danger"
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
