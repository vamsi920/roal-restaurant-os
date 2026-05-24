"use client";

import { useCallback, useEffect, useState } from "react";
import { formatApiRouteError } from "@/lib/dashboard/format-user-error";
import type { MenuImportListItem, MenuImportStatus } from "@/lib/menu-import/audit-types";
import { cn } from "@/lib/cn";

const STATUS_LABEL: Record<MenuImportStatus, string> = {
  pending: "Pending",
  uploaded: "Uploaded",
  extracted: "Ready to commit",
  extraction_failed: "Extract failed",
  committed: "Committed",
  commit_failed: "Commit failed",
  discarded: "Discarded",
};

const STATUS_CLASS: Record<MenuImportStatus, string> = {
  pending: "bg-subtle/15 text-muted",
  uploaded: "bg-accent-soft text-accent",
  extracted: "bg-accent-soft text-accent",
  extraction_failed: "bg-danger/10 text-danger",
  committed: "bg-success/10 text-success",
  commit_failed: "bg-danger/10 text-danger",
  discarded: "bg-subtle/15 text-muted line-through",
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
  return `+${m.categories ?? 0} cat · ${m.items ?? 0} items · ${m.modifiers ?? 0} mods`;
}

export function MenuImportHistory({ restaurantId }: { restaurantId: string }) {
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

  return (
    <section className="glass-card overflow-hidden">
      <div className="flex flex-col gap-1 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div>
          <h2 className="text-sm font-semibold">Recent menu imports</h2>
          <p className="mt-0.5 text-xs text-muted">
            Audit trail of uploads, extraction, and commits.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="btn-ghost mt-2 w-full text-xs sm:mt-0 sm:w-auto"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto p-4 sm:p-6">
        {loading && imports.length === 0 ? (
          <p className="text-xs text-muted">Loading…</p>
        ) : null}
        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error && imports.length === 0 ? (
          <p className="text-xs text-muted">No menu imports yet.</p>
        ) : null}
        {imports.length > 0 ? (
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-line text-[10px] font-medium uppercase tracking-wider text-subtle">
                <th className="pb-2 pr-3 font-medium">When</th>
                <th className="pb-2 pr-3 font-medium">File</th>
                <th className="pb-2 pr-3 font-medium">By</th>
                <th className="pb-2 pr-3 font-medium">Model</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {imports.map((row) => {
                const status = row.extraction_status;
                const summary = mergeSummary(row);
                return (
                  <tr key={row.id} className="align-top">
                    <td className="py-2.5 pr-3 text-muted whitespace-nowrap">
                      {formatWhen(row.created_at)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="max-w-[180px] truncate font-medium text-ink">
                        {row.original_filename ?? "menu image"}
                      </div>
                      <div className="text-[11px] text-muted">
                        {formatBytes(row.file_size_bytes)}
                        {row.signed_image_url ? (
                          <>
                            {" · "}
                            <a
                              href={row.signed_image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:underline"
                            >
                              View
                            </a>
                          </>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-muted">
                      {row.uploader_name ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-muted">
                      {row.model_used ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          STATUS_CLASS[status]
                        )}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                      {row.extraction_error ? (
                        <p className="mt-1 max-w-[200px] text-[11px] text-danger">
                          {row.extraction_error}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-2.5 text-muted">
                      {summary ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}
