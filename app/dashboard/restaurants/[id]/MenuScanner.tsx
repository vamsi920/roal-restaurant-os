"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MenuImportReview } from "@/components/menu-import/MenuImportReview";
import type { ReviewHint, ScannedMenu } from "@/lib/menu-import/types";
import {
  MENU_IMAGE_MAX_BYTES,
  validateMenuImageFile,
} from "@/lib/scanner/extract-menu";
import { formatScannerApiError } from "@/lib/scanner/scanner-user-messages";
import { PlanLimitNotice } from "@/components/billing/PlanLimitNotice";
import { notifyMenuChanged } from "@/lib/menu-editor/notify-menu-changed";
import type { SerializableGateVerdict } from "@/lib/billing/gates";
import { cn } from "@/lib/cn";
import { Check, ImagePlus, Loader2, ScanLine, Trash2, X } from "lucide-react";
import { Badge, type Tone } from "@/components/ui";
import { Notice } from "@/components/live-orders/workspace-ui";

type Status =
  | "idle"
  | "uploading"
  | "scanning"
  | "review"
  | "committing"
  | "done"
  | "error";

type Stats = {
  categories: number;
  items: number;
  modifiers: number;
};

const STEP_ORDER: Status[] = [
  "uploading",
  "scanning",
  "review",
  "committing",
  "done",
];

const STEP_LABELS: Record<Status, string> = {
  idle: "Ready",
  uploading: "Uploading photo",
  scanning: "Reading your menu",
  review: "Review & fix",
  committing: "Adding to your menu",
  done: "Added to menu",
  error: "Needs attention",
};

const STATUS_TONE: Partial<Record<Status, Tone>> = {
  uploading: "info",
  scanning: "info",
  committing: "info",
  review: "warn",
  done: "ok",
  error: "bad",
};

export function MenuScanner({
  restaurantId,
  onScanComplete,
  compact,
  menuScanGate,
  hidePanelHeader,
}: {
  restaurantId: string;
  onScanComplete?: () => void;
  /** Hide clear-menu and extra chrome for onboarding embed. */
  compact?: boolean;
  menuScanGate?: SerializableGateVerdict | null;
  /** Parent section supplies the visible title (menu setup page). */
  hidePanelHeader?: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [reviewMenu, setReviewMenu] = useState<ScannedMenu | null>(null);
  const [, setReviewHints] = useState<ReviewHint[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearPending, setClearPending] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const isWorking =
    status === "uploading" ||
    status === "scanning" ||
    status === "committing";

  const notifyImportsChanged = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("roal:menu-imports-changed", {
        detail: { restaurantId },
      })
    );
  }, [restaurantId]);

  const abandonImport = useCallback(async (id: string) => {
    try {
      await fetch("/api/scanner/discard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          import_id: id,
        }),
      });
    } catch {
      // non-blocking
    }
    notifyImportsChanged();
  }, [restaurantId, notifyImportsChanged]);

  const onFile = useCallback(
    (f: File | null) => {
      if (!f) return;
      try {
        validateMenuImageFile(f);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid image file");
        setStatus("error");
        return;
      }
      setImportId((prev) => {
        if (prev) void abandonImport(prev);
        return null;
      });
      setFile(f);
      setError(null);
      setStatus("idle");
      setStats(null);
      setReviewMenu(null);
      setReviewHints([]);
    },
    [abandonImport]
  );

  async function process() {
    if (!file) return;
    setError(null);
    setStats(null);
    setStatus("uploading");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("restaurant_id", restaurantId);

      setStatus("scanning");

      const res = await fetch("/api/scanner/extract", {
        method: "POST",
        body: fd,
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (typeof body.import_id === "string") {
          setImportId(body.import_id);
        }
        throw new Error(formatScannerApiError(body, res.status));
      }

      setImportId(typeof body.import_id === "string" ? body.import_id : null);
      setReviewMenu(body.menu as ScannedMenu);
      setReviewHints((body.hints as ReviewHint[]) ?? []);
      setStatus("review");
      notifyImportsChanged();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      setStatus("error");
      notifyImportsChanged();
    }
  }

  async function commitReview() {
    if (!reviewMenu) return;
    setError(null);
    setStatus("committing");
    try {
      const res = await fetch("/api/scanner/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          menu: reviewMenu,
          import_id: importId ?? undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const hintList = Array.isArray(body.hints)
          ? (body.hints as { message?: string }[])
              .map((h) => h.message)
              .filter(Boolean)
              .join("; ")
          : "";
        throw new Error(
          hintList ||
            formatScannerApiError(body, res.status) ||
            "Could not save menu"
        );
      }
      setStats(body.stats ?? null);
      setImportId(null);
      setReviewMenu(null);
      setReviewHints([]);
      setStatus("done");
      notifyMenuChanged(restaurantId);
      notifyImportsChanged();
      onScanComplete?.();
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      setStatus("review");
    }
  }

  async function discardReview() {
    const id = importId;
    setReviewMenu(null);
    setReviewHints([]);
    setImportId(null);
    setStatus("idle");
    setError(null);
    if (id) await abandonImport(id);
  }

  function reset() {
    const id = importId;
    setFile(null);
    setPreview(null);
    setStatus("idle");
    setStats(null);
    setImportId(null);
    setReviewMenu(null);
    setReviewHints([]);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    if (id) void abandonImport(id);
  }

  async function clearMenu() {
    setClearError(null);
    setClearPending(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/menu`, {
        method: "DELETE",
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to clear menu");
      }
      setClearOpen(false);
      reset();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("roal:menu-cleared", {
            detail: { restaurantId },
          })
        );
      }
      router.refresh();
    } catch (e) {
      setClearError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setClearPending(false);
    }
  }

  const clearButton = !compact ? (
    <button
      type="button"
      onClick={() => {
        setClearError(null);
        setClearOpen(true);
      }}
      disabled={isWorking}
      className="btn-danger btn-sm"
    >
      <Trash2 size={13} aria-hidden /> Clear menu
    </button>
  ) : null;

  const body = (
    <>
      {!hidePanelHeader ? (
        <div className="panel__head">
          <div className="min-w-0 flex-1">
            <h2 className="panel__title">Scan a menu photo</h2>
            <p className="text-[12.5px] text-subtle">
              Upload a photo of your printed menu. We read items and prices, you
              review, then it merges into your live menu.
            </p>
          </div>
          {clearButton}
        </div>
      ) : null}

      <PlanLimitNotice
        verdict={menuScanGate}
        className={hidePanelHeader ? "mb-3" : "mx-[1.125rem] mt-3"}
      />

      <Transition appear show={clearOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !clearPending && setClearOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200 motion-reduce:duration-0"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150 motion-reduce:duration-0"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-ink/30" aria-hidden />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200 motion-reduce:duration-0"
                enterFrom="opacity-0 translate-y-2"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in duration-150 motion-reduce:duration-0"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-2"
              >
                <Dialog.Panel className="panel w-full max-w-md p-5 shadow-lg sm:p-6">
                  <Dialog.Title className="font-display text-[18px] font-bold tracking-[-0.01em] text-ink">
                    Clear entire menu?
                  </Dialog.Title>
                  <p className="mt-2 text-[13.5px] text-muted">
                    This removes all categories, items, and modifiers for this
                    restaurant. The phone host will have nothing to sell until you
                    add a menu again.
                  </p>
                  {clearError ? (
                    <Notice tone="bad" className="mt-3">
                      {clearError}
                    </Notice>
                  ) : null}
                  <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className="btn-ghost w-full sm:w-auto"
                      disabled={clearPending}
                      onClick={() => setClearOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-danger w-full sm:w-auto"
                      disabled={clearPending}
                      onClick={() => void clearMenu()}
                    >
                      {clearPending ? (
                        <>
                          <Spinner /> Clearing…
                        </>
                      ) : (
                        "Yes, clear menu"
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <div
        className={cn(
          "menu-scanner__layout grid min-w-0 grid-cols-1 gap-4",
          !reviewMenu && "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]",
          !hidePanelHeader && "p-[1.125rem]"
        )}
      >
        <div className="menu-scanner__upload-col min-w-0">
          <label
            htmlFor="menu-image"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
            className={cn(
              "menu-scanner__upload group relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[12px] border border-dashed text-center transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink/75 motion-reduce:transition-none",
              reviewMenu ? "sm:min-h-[160px]" : "sm:aspect-[16/10]",
              isDragging
                ? "border-accent bg-accent-soft"
                : "border-line-strong bg-elev hover:bg-card",
              preview && "border-solid border-line"
            )}
          >
            <input
              ref={inputRef}
              id="menu-image"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              disabled={isWorking || menuScanGate?.hardBlocked}
            />

            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Menu preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {isWorking ? (
                  <div className="scan-overlay absolute inset-0 bg-card/60" aria-hidden />
                ) : null}
              </>
            ) : (
              <>
                <span className="icon-tile icon-tile--lg icon-tile--orange" aria-hidden>
                  <ImagePlus size={20} />
                </span>
                <p className="mt-3 px-4 text-[14px] font-semibold text-ink">
                  Drop a menu photo, or click to browse
                </p>
                <p className="mt-1 px-4 text-[12.5px] text-subtle">
                  PNG, JPG, WebP — max {(MENU_IMAGE_MAX_BYTES / (1024 * 1024)).toFixed(0)} MB
                </p>
              </>
            )}
          </label>

          <div className="menu-scanner__actions mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-[12.5px] text-subtle sm:flex-1">
              {file ? (
                <span className="block [overflow-wrap:anywhere] sm:truncate">
                  {file.name} · {(file.size / 1024).toFixed(0)} KB
                </span>
              ) : (
                "No file selected"
              )}
            </p>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
              {file && !isWorking && status !== "review" ? (
                <button type="button" onClick={reset} className="btn-ghost min-h-11 w-full sm:min-h-0 sm:w-auto">
                  Reset
                </button>
              ) : null}
              <button
                type="button"
                onClick={process}
                disabled={
                  !file ||
                  isWorking ||
                  status === "review" ||
                  menuScanGate?.hardBlocked
                }
                aria-busy={isWorking}
                className="btn-primary min-h-11 w-full sm:min-h-0 sm:w-auto"
              >
                {isWorking ? (
                  <>
                    <Spinner /> Reading menu…
                  </>
                ) : status === "review" ? (
                  "Review below"
                ) : (
                  <>
                    <ScanLine size={15} aria-hidden /> Scan menu
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className={cn("menu-scanner__status-col flex min-w-0 flex-col gap-3", reviewMenu && "hidden")}>
          <div className="menu-scanner__pipeline rounded-[12px] border border-line bg-elev/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-ink">Progress</h3>
              <Badge tone={STATUS_TONE[status] ?? "neutral"}>{STEP_LABELS[status]}</Badge>
            </div>

            <ol className="mt-3 space-y-2" aria-label="Scan progress">
              {STEP_ORDER.map((step, idx) => {
                const currentIdx =
                  status === "error"
                    ? STEP_ORDER.indexOf("scanning")
                    : STEP_ORDER.indexOf(status);
                const isActive =
                  step === status && status !== "done" && status !== "error";
                const isComplete =
                  status === "done" ||
                  (currentIdx > -1 && idx < currentIdx);
                return (
                  <li
                    key={step}
                    className="flex items-center gap-2.5"
                    aria-current={isActive ? "step" : undefined}
                  >
                    <StepDot
                      active={isActive}
                      complete={isComplete}
                      errored={status === "error" && idx === currentIdx}
                    />
                    <span
                      className={cn(
                        "text-[13px]",
                        isActive && "font-medium text-ink",
                        isComplete && "text-muted",
                        !isActive && !isComplete && "text-subtle"
                      )}
                    >
                      {STEP_LABELS[step]}
                    </span>
                  </li>
                );
              })}
            </ol>

            {isWorking ? (
              <div className="mt-4 space-y-2" aria-hidden>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow short />
              </div>
            ) : null}

            {stats && status === "done" ? (
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
                <StatCell label="Categories" value={stats.categories} />
                <StatCell label="Items" value={stats.items} />
                <StatCell label="Modifiers" value={stats.modifiers} />
              </div>
            ) : null}
          </div>

          {error ? (
            <div
              role="alert"
              className="menu-scanner__error rounded-[10px] border border-danger/25 bg-danger/[0.05] p-3 text-[13px] text-danger"
            >
              <p className="[overflow-wrap:anywhere]">{error}</p>
              {status === "error" && !reviewMenu ? (
                <p className="mt-1 text-[12.5px] text-danger/80">
                  Try a sharper photo with the full menu visible, or use Reset to
                  choose another file.
                </p>
              ) : null}
              {importId && status === "error" ? (
                <button
                  type="button"
                  className="btn-ghost btn-sm mt-2 min-h-11 w-full sm:min-h-0 sm:w-auto"
                  disabled={isWorking}
                  onClick={() => void discardReview()}
                >
                  Discard failed import
                </button>
              ) : null}
            </div>
          ) : null}

          <details className="menu-scanner__import-flow rounded-[10px] border border-line sm:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center px-3 text-[13px] font-medium text-muted">
              How import works
            </summary>
            <ImportSteps className="px-3 pb-3" />
          </details>
          <div className="menu-scanner__import-flow-desktop hidden sm:block">
            <ImportSteps />
          </div>
        </div>

        {reviewMenu ? (
          <div className="menu-scanner__review min-w-0">
            {error ? (
              <Notice tone="bad" className="mb-3">
                {error}
              </Notice>
            ) : null}
            <MenuImportReview
              menu={reviewMenu}
              pending={status === "committing"}
              onChange={setReviewMenu}
              onDiscard={discardReview}
              onCommit={() => void commitReview()}
            />
          </div>
        ) : null}
      </div>

      {hidePanelHeader && clearButton ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-subtle">
            Starting over? Clear the menu, then scan a new photo.
          </p>
          {clearButton}
        </div>
      ) : null}
    </>
  );

  if (hidePanelHeader) {
    return <div className="menu-scanner min-w-0">{body}</div>;
  }
  return <section className="menu-scanner panel min-w-0 overflow-hidden">{body}</section>;
}

function ImportSteps({ className }: { className?: string }) {
  return (
    <ul className={cn("space-y-1.5 text-[12.5px] text-subtle", className)}>
      <li className="flex gap-2">
        <BulletDot /> We read categories, items, prices, and options from the photo.
      </li>
      <li className="flex gap-2">
        <BulletDot /> You fix anything flagged before it goes live.
      </li>
      <li className="flex gap-2">
        <BulletDot /> Saving merges into your menu — existing items update, new ones are added.
      </li>
    </ul>
  );
}

function StepDot({
  active,
  complete,
  errored,
}: {
  active: boolean;
  complete: boolean;
  errored: boolean;
}) {
  if (errored) {
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-danger/10 text-danger" aria-hidden>
        <X size={12} strokeWidth={3} />
      </span>
    );
  }
  if (complete) {
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-success/10 text-success" aria-hidden>
        <Check size={12} strokeWidth={3} />
      </span>
    );
  }
  if (active) {
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-ink/10" aria-hidden>
        <span className="block h-2 w-2 rounded-full bg-ink motion-safe:animate-pulse" />
      </span>
    );
  }
  return (
    <span className="grid h-5 w-5 place-items-center rounded-full border border-line bg-card" aria-hidden>
      <span className="block h-1.5 w-1.5 rounded-full bg-subtle/50" />
    </span>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-line bg-card px-3 py-2">
      <div className="text-[11.5px] font-medium text-subtle">{label}</div>
      <div className="mt-0.5 font-display text-[18px] font-bold tabular-nums text-ink">{value}</div>
    </div>
  );
}

function SkeletonRow({ short }: { short?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="skeleton h-3 w-3 rounded-full" />
      <div className={cn("skeleton h-3 rounded", short ? "w-2/5" : "w-3/4")} />
    </div>
  );
}

function BulletDot() {
  return (
    <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-subtle" aria-hidden />
  );
}

function Spinner() {
  return <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden />;
}
