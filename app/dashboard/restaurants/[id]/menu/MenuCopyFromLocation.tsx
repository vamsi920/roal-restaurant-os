"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyMenuTemplateAction,
  applyTemplateToInheritedLocationsAction,
  copyMenuFromRestaurantAction,
  saveMenuTemplateAction,
  setDefaultMenuTemplateAction,
} from "./menu-actions";
import type { OrganizationMenuTemplate } from "@/lib/menu-editor/copy-menu";

type MenuCopySource = {
  id: string;
  name: string;
};

export function MenuCopyFromLocation({
  restaurantId,
  sources,
  templates,
  inheritedTemplateId,
  inheritedTemplateAppliedAt,
  inheritedTemplateOverrideCount,
  inheritedTemplateLastLocalEditAt,
}: {
  restaurantId: string;
  sources: MenuCopySource[];
  templates: OrganizationMenuTemplate[];
  inheritedTemplateId: string | null;
  inheritedTemplateAppliedAt: string | null;
  inheritedTemplateOverrideCount: number;
  inheritedTemplateLastLocalEditAt: string | null;
}) {
  const router = useRouter();
  const initialTemplateId =
    inheritedTemplateId && templates.some((template) => template.id === inheritedTemplateId)
      ? inheritedTemplateId
      : templates[0]?.id ?? "";
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [templateName, setTemplateName] = useState("Main menu");
  const [makeDefault, setMakeDefault] = useState(templates.length === 0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === sourceId) ?? null,
    [sourceId, sources]
  );
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) ?? null,
    [templateId, templates]
  );
  const inheritedTemplate = useMemo(
    () =>
      inheritedTemplateId
        ? templates.find((template) => template.id === inheritedTemplateId) ?? null
        : null,
    [inheritedTemplateId, templates]
  );
  const inheritedAppliedLabel = inheritedTemplateAppliedAt
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(inheritedTemplateAppliedAt))
    : null;
  const inheritedLocalEditLabel = inheritedTemplateLastLocalEditAt
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(inheritedTemplateLastLocalEditAt))
    : null;

  function copyMenu() {
    if (!sourceId || pending) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await copyMenuFromRestaurantAction(restaurantId, sourceId);
        setNotice(
          `Copied ${result.stats.categories} categories, ${result.stats.items} items, and ${result.stats.modifiers} modifiers.`
        );
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Menu copy failed.");
      }
    });
  }

  function saveTemplate() {
    if (pending) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await saveMenuTemplateAction(restaurantId, {
          name: templateName,
          makeDefault,
        });
        setTemplateId(result.template.id);
        setNotice(
          result.template.is_default
            ? `Saved "${result.template.name}" as the default menu for new locations.`
            : `Saved "${result.template.name}" as a reusable menu template.`
        );
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Template save failed.");
      }
    });
  }

  function makeSelectedDefault() {
    if (!templateId || pending) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await setDefaultMenuTemplateAction(restaurantId, templateId);
        setNotice(
          `"${result.template.name}" will be applied to new locations before their voice agent is synced.`
        );
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Default template update failed.");
      }
    });
  }

  function applyTemplate() {
    if (!templateId || pending) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await applyMenuTemplateAction(restaurantId, templateId);
        setNotice(
          `Applied template with ${result.stats.categories} categories, ${result.stats.items} items, and ${result.stats.modifiers} modifiers.`
        );
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Template apply failed.");
      }
    });
  }

  function reapplyInheritedTemplate() {
    if (!inheritedTemplate || pending) return;
    setTemplateId(inheritedTemplate.id);
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await applyMenuTemplateAction(restaurantId, inheritedTemplate.id);
        setNotice(
          `Re-applied "${inheritedTemplate.name}" with ${result.stats.categories} categories, ${result.stats.items} items, and ${result.stats.modifiers} modifiers.`
        );
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Inherited template apply failed.");
      }
    });
  }

  function updateInheritedLocations() {
    if (!templateId || !selectedTemplate || pending) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const { result } = await applyTemplateToInheritedLocationsAction(restaurantId, templateId);
        const updated = result.applied.length;
        const failed = result.failed.length;
        const additive = result.applied.filter((row) => row.mode === "add_missing").length;
        const preservedFieldOverrides = result.applied.reduce(
          (sum, row) => sum + (row.diff?.itemFieldOverrides.length ?? 0),
          0
        );
        const localOnlyItems = result.applied.reduce(
          (sum, row) => sum + (row.diff?.localOnlyItems.length ?? 0),
          0
        );
        const locallyCustomized = result.skipped.filter(
          (row) => row.reason === "local_override"
        ).length;
        if (updated === 0 && failed === 0) {
          setNotice(
            locallyCustomized > 0
              ? `No locations updated. ${locallyCustomized} customized location${locallyCustomized === 1 ? " was" : "s were"} skipped.`
              : `No inherited locations currently use "${selectedTemplate.name}".`
          );
        } else if (failed > 0) {
          setNotice(
            `Updated ${updated} inherited location${updated === 1 ? "" : "s"}. ${failed} failed; check the location menu and logs.`
          );
        } else {
          setNotice(
            `Updated ${updated} inherited location${updated === 1 ? "" : "s"} and queued voice-agent menu sync${additive > 0 ? `; added missing brand items to ${additive} customized location${additive === 1 ? "" : "s"}` : ""}${preservedFieldOverrides > 0 ? `; preserved ${preservedFieldOverrides} local item override${preservedFieldOverrides === 1 ? "" : "s"}` : ""}${localOnlyItems > 0 ? ` and ${localOnlyItems} local-only item${localOnlyItems === 1 ? "" : "s"}` : ""}${locallyCustomized > 0 ? `; skipped ${locallyCustomized} customized location${locallyCustomized === 1 ? "" : "s"}` : ""}.`
          );
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Inherited location update failed.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Save one brand menu as a reusable template, then apply it to new locations.
        ROAL re-syncs the live agent after every applied menu change.
      </p>
      {templates.length > 0 ? (
        <div className="rounded-xl border border-line bg-elev/60 p-3">
          {inheritedTemplate ? (
            <div className="mb-3 rounded-lg border border-accent/20 bg-accent/10 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-ink">
                  This location inherited “{inheritedTemplate.name}”
                  {inheritedAppliedLabel ? ` on ${inheritedAppliedLabel}` : ""}.
                </p>
                <button
                  type="button"
                  onClick={reapplyInheritedTemplate}
                  disabled={pending}
                  className="btn-ghost kds-thumb-btn min-h-10 w-full px-3 text-sm sm:w-auto"
                >
                  {pending ? "Applying..." : "Re-apply inherited"}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">
                Use this when the brand menu changed and this store should match
                the latest shared template.
              </p>
              {inheritedTemplateOverrideCount > 0 ? (
                <p className="mt-2 rounded-md border border-warning/20 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                  This location has {inheritedTemplateOverrideCount} local menu edit
                  {inheritedTemplateOverrideCount === 1 ? "" : "s"}
                  {inheritedLocalEditLabel ? ` since ${inheritedLocalEditLabel}` : ""}.
                  Brand-wide template pushes skip customized locations until you re-apply the
                  template here.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-sm font-medium text-ink">
              Shared menu template
              <select
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-line bg-card px-3 text-sm text-ink"
                disabled={pending}
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.is_default ? `${template.name} (default)` : template.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={applyTemplate}
              disabled={pending || !selectedTemplate}
              className="btn-primary kds-thumb-btn min-h-11 w-full px-4 text-sm sm:w-auto"
            >
              {pending ? "Applying..." : "Apply template"}
            </button>
            <button
              type="button"
              onClick={makeSelectedDefault}
              disabled={pending || !selectedTemplate || selectedTemplate.is_default}
              className="btn-ghost kds-thumb-btn min-h-11 w-full px-4 text-sm sm:w-auto"
            >
              {selectedTemplate?.is_default ? "Default" : "Use for new locations"}
            </button>
            <button
              type="button"
              onClick={updateInheritedLocations}
              disabled={pending || !selectedTemplate}
              className="btn-ghost kds-thumb-btn min-h-11 w-full px-4 text-sm sm:w-auto"
            >
              {pending ? "Updating..." : "Update inherited locations"}
            </button>
          </div>
          {selectedTemplate ? (
            <p className="mt-2 text-xs text-subtle">
              {selectedTemplate.category_count} categories ·{" "}
              {selectedTemplate.item_count} items ·{" "}
              {selectedTemplate.modifier_count} modifiers
              {selectedTemplate.is_default ? " · Default for new locations" : ""}.
              Applying replaces
              this location&apos;s menu and re-syncs the voice agent. Updating inherited locations
              replaces unchanged inherited stores. Customized stores receive missing brand
              categories/items while local item prices, descriptions, availability, modifiers,
              and local-only items stay untouched.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-line bg-elev/60 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-sm font-medium text-ink">
            Save current menu as template
            <input
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-line bg-card px-3 text-sm text-ink"
              disabled={pending}
              placeholder="Main menu"
            />
          </label>
          <button
            type="button"
            onClick={saveTemplate}
            disabled={pending || templateName.trim().length < 2}
            className="btn-ghost kds-thumb-btn min-h-11 w-full px-4 text-sm sm:w-auto"
          >
            {pending ? "Saving..." : "Save template"}
          </button>
        </div>
        <label className="mt-3 flex items-start gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={makeDefault}
            onChange={(event) => setMakeDefault(event.target.checked)}
            disabled={pending}
            className="mt-0.5 h-4 w-4 rounded border-line"
          />
          <span>
            Use this as the default menu for new locations. New restaurants will
            inherit it before their ElevenLabs agent is provisioned.
          </span>
        </label>
        <p className="mt-2 text-xs text-subtle">
          Use this for a brand menu you want to apply to future locations.
        </p>
      </div>

      {sources.length > 0 ? (
        <div className="rounded-xl border border-line bg-elev/60 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-sm font-medium text-ink">
              Source location
              <select
                value={sourceId}
                onChange={(event) => setSourceId(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-line bg-card px-3 text-sm text-ink"
                disabled={pending}
              >
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={copyMenu}
              disabled={pending || !selectedSource}
              className="btn-ghost kds-thumb-btn min-h-11 w-full px-4 text-sm sm:w-auto"
            >
              {pending ? "Copying..." : "Copy once"}
            </button>
          </div>
          {selectedSource ? (
            <p className="mt-2 text-xs text-subtle">
              This replaces the current menu with {selectedSource.name}&apos;s
              categories, items, modifiers, prices, and availability.
            </p>
          ) : null}
        </div>
      ) : null}
      {notice ? <p className="text-sm font-medium text-success">{notice}</p> : null}
      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
    </div>
  );
}
