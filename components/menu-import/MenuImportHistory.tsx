"use client";

import { useCallback, useEffect, useState } from "react";
import { formatApiRouteError } from "@/lib/dashboard/format-user-error";
import type { MenuImportListItem, MenuImportStatus } from "@/lib/menu-import/audit-types";
import { cn } from "@/lib/cn";
import { History, ScanLine } from "lucide-react";
import { Badge, EmptyState, IconTile, type Tone } from "@/components/ui";
import {
  LoadingRows,
  Notice,
  RefreshButton,
} from "@/components/live-orders/workspace-ui";

const STATUS_LABEL: Record<MenuImportStatus, string> = {
  pending: "Pending",
  uploaded: "Uploaded",
  extracted: "Ready to commit",
  extraction_failed: "Extract failed",
  committed: "Committed",
  commit_failed: "Commit failed",
  discarded: "Discarded",
};

const STATUS_TONE: Record<MenuImportStatus, Tone> = {
  pending: "neutral",
  uploaded: "info",
  extracted: "info",
  extraction_failed: "bad",
  committed: "ok",
  commit_failed: "bad",
  discarded: "neutral",
};

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatBytes(n: number | null) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

function mergeSummary(row: MenuImportListItem): string | null {
  const m = row.merge_result as {
    categories?: number;
    items?: number;
    modifiers?: number;
  } | null;
  if (!m) return null;
  return `${m.categories ?? 0} categories · ${m.items ?? 0} items · ${m.modifiers ?? 0} modifiers`;
}

export function MenuImportHistory({
  restaurantId,
  hidePanelHeader = false,
}: {
  restaurantId: string;
  hidePanelHeader?: boolean;
}) {
  const [imports, setImports] = useState<MenuImportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/menu-imports`,
        { cache: "no-store" }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          formatApiRouteError(body, res.status, "Could not load import history.")
        );
      }
      setImports((body.imports as MenuImportListItem[]) ?? []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load import history."
      );
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onChanged(e: Event) {
      const detail = (e as CustomEvent<{ restaurantId?: string }>).detail;
      if (detail?.restaurantId && detail.restaurantId !== restaurantId) return;
      void load();
    }
    window.addEventListener("roal:menu-imports-changed", onChanged);
    return () =>
      window.removeEventListener("roal:menu-imports-changed", onChanged);
  }, [load, restaurantId]);

  function refresh() {
    setLoading(true);
    void load();
  }

  return (
    <section
      className={cn(
        "menu-import-history min-w-0 max-w-full",
        !hidePanelHeader && "panel overflow-hidden"
      )}
      aria-labelledby={hidePanelHeader ? undefined : "menu-setup-import-heading"}
      aria-label={hidePanelHeader ? "Menu import history" : undefined}
    >
      {hidePanelHeader ? (
        <div className="menu-import-history__toolbar flex items-center justify-between gap-2 pb-3">
          <p className="text-[12.5px] text-subtle">
            Every scan and save, newest first.
          </p>
          <RefreshButton onClick={refresh} busy={loading} label="Refresh history" />
        </div>
      ) : (
        <div className="panel__head">
          <div className="min-w-0">
            <h2 id="menu-setup-import-heading" className="panel__title">
              Import history
            </h2>
            <p className="text-[12.5px] text-subtle">
              Every scan and save, newest first.
            </p>
          </div>
          <RefreshButton onClick={refresh} busy={loading} label="Refresh history" />
        </div>
      )}

      <div className="menu-import-history__body min-w-0">
        {loading && imports.length === 0 ? (
          <LoadingRows label="Loading import history…" rows={3} className="p-0 py-2" />
        ) : null}
        {error && imports.length === 0 && !loading ? (
          <EmptyState
            icon={History}
            title="Import history unavailable"
            body={error}
            action={
              <button
                type="button"
                className="btn-ghost"
                disabled={loading}
                onClick={refresh}
              >
                {loading ? "Retrying…" : "Try again"}
              </button>
            }
          />
        ) : null}
        {!loading && !error && imports.length === 0 ? (
          <EmptyState
            icon={ScanLine}
            title="No menu imports yet"
            body="Scan a menu photo and each upload and save is logged here for your team."
          />
        ) : null}
        {error && imports.length > 0 ? (
          <Notice tone="bad" className="menu-import-history__banner mb-3">
            {error}
          </Notice>
        ) : null}
        {imports.length > 0 ? (
          <ul
            className={cn(
              "menu-import-history__list min-w-0 divide-y divide-line/70",
              hidePanelHeader && "overflow-hidden rounded-[12px] border border-line"
            )}
          >
            {imports.map((row) => {
              const status = row.extraction_status;
              const summary = mergeSummary(row);
              return (
                <li key={row.id} className="flex min-w-0 items-start gap-3 px-[1.125rem] py-3">
                  <IconTile
                    icon={ScanLine}
                    color={STATUS_TONE[status] === "bad" ? "rose" : STATUS_TONE[status] === "ok" ? "green" : "blue"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <p className="menu-import-history__file min-w-0 text-[13.5px] font-medium text-ink [overflow-wrap:anywhere] sm:truncate">
                        {row.original_filename ?? "Menu photo"}
                      </p>
                      <Badge
                        tone={STATUS_TONE[status]}
                        className={cn("menu-import-history__status", status === "discarded" && "line-through")}
                      >
                        {STATUS_LABEL[status]}
                      </Badge>
                    </div>
                    <p className="menu-import-history__when mt-0.5 text-[12.5px] text-subtle [overflow-wrap:anywhere]">
                      {formatWhen(row.created_at)}
                      {row.uploader_name ? ` · ${row.uploader_name}` : ""}
                      {` · ${formatBytes(row.file_size_bytes)}`}
                      {row.model_used ? ` · ${row.model_used}` : ""}
                    </p>
                    {summary ? (
                      <p className="menu-import-history__result mt-0.5 text-[12.5px] text-muted">
                        {summary}
                      </p>
                    ) : null}
                    {row.extraction_error ? (
                      <p
                        className="menu-import-history__status-error mt-1 text-[12.5px] text-danger [overflow-wrap:anywhere]"
                        role="alert"
                      >
                        {row.extraction_error}
                      </p>
                    ) : null}
                    {row.signed_image_url ? (
                      <a
                        href={row.signed_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex min-h-11 items-center text-[12.5px] font-medium text-ink underline underline-offset-2 lg:min-h-0"
                      >
                        View photo
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
