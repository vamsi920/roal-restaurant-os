"use client";

import { Dialog, Transition } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

type Status = "idle" | "uploading" | "scanning" | "merging" | "done" | "error";

type Stats = {
  categories: number;
  items: number;
  modifiers: number;
};

const STEP_ORDER: Status[] = ["uploading", "scanning", "merging", "done"];

const STEP_LABELS: Record<Status, string> = {
  idle: "Idle",
  uploading: "Uploading image",
  scanning: "Scanning with Gemini Vision",
  merging: "Merging into database",
  done: "Synced",
  error: "Error",
};

export function MenuScanner({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
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

  const isWorking = status === "uploading" || status === "scanning" || status === "merging";

  const onFile = useCallback((f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }
    setFile(f);
    setError(null);
    setStatus("idle");
    setStats(null);
  }, []);

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

      const res = await fetch("/api/scanner/process", {
        method: "POST",
        body: fd,
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Scan failed");
      }

      setStatus("merging");
      await new Promise((r) => setTimeout(r, 350));
      setStats(body.stats ?? null);
      setStatus("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      setStatus("error");
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setStatus("idle");
    setStats(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
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

  return (
    <section className="glass-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-6 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Menu scanner</h2>
          <p className="mt-0.5 text-xs text-muted">
            Drop a menu photo. Gemini extracts categories, items, modifiers,
            and ROAL atomically merges into your live menu.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setClearError(null);
              setClearOpen(true);
            }}
            disabled={isWorking}
            className="rounded-lg border border-danger/35 bg-danger/[0.04] px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/[0.08] disabled:opacity-50"
          >
            Clear menu
          </button>
        </div>
      </div>

      <Transition appear show={clearOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !clearPending && setClearOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-ink/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-2 scale-[0.98]"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-2 scale-[0.98]"
              >
                <Dialog.Panel className="glass-card w-full max-w-md p-6 shadow-lg">
                  <Dialog.Title className="text-base font-semibold tracking-tight">
                    Clear entire menu?
                  </Dialog.Title>
                  <p className="mt-2 text-sm text-muted">
                    This removes all categories, items, and modifiers for this
                    restaurant. You can scan a menu again afterward.
                  </p>
                  {clearError && (
                    <p className="mt-3 text-xs text-danger">{clearError}</p>
                  )}
                  <div className="mt-6 flex justify-end gap-2">
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={clearPending}
                      onClick={() => setClearOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/15 disabled:opacity-60"
                      disabled={clearPending}
                      onClick={() => void clearMenu()}
                    >
                      {clearPending ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner /> Clearing…
                        </span>
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

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
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
              "group relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed transition-all",
              isDragging
                ? "border-accent bg-accent-soft/80"
                : "border-line-strong bg-elev hover:border-line-strong hover:bg-card",
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
              disabled={isWorking}
            />

            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Menu preview"
                  className="h-full w-full object-cover"
                />
                {isWorking && (
                  <div className="scan-overlay absolute inset-0 bg-card/55 backdrop-blur-[2px]" />
                )}
              </>
            ) : (
              <>
                <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
                <div className="relative grid h-12 w-12 place-items-center rounded-xl border border-line bg-card shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <p className="relative mt-4 text-sm font-medium">
                  Drop image, or click to browse
                </p>
                <p className="relative mt-1 text-xs text-muted">
                  PNG, JPG, WebP — clear photos work best
                </p>
              </>
            )}
          </label>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 text-xs text-muted">
              {file ? (
                <span className="truncate">
                  {file.name} · {(file.size / 1024).toFixed(0)} KB
                </span>
              ) : (
                "No file selected"
              )}
            </div>
            <div className="flex items-center gap-2">
              {file && !isWorking && (
                <button type="button" onClick={reset} className="btn-ghost">
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={process}
                disabled={!file || isWorking}
                className="btn-primary"
              >
                {isWorking ? (
                  <>
                    <Spinner /> Processing
                  </>
                ) : (
                  <>
                    Process menu
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="rounded-xl border border-line bg-elev p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
                Pipeline
              </h3>
              <span
                className={cn(
                  "text-[11px] font-medium uppercase tracking-wider",
                  status === "done" && "text-success",
                  status === "error" && "text-danger",
                  isWorking && "text-accent",
                  status === "idle" && "text-subtle"
                )}
              >
                {STEP_LABELS[status]}
              </span>
            </div>

            <ol className="mt-4 space-y-2.5">
              {STEP_ORDER.map((step, idx) => {
                const currentIdx = STEP_ORDER.indexOf(status);
                const isActive = step === status && status !== "done";
                const isComplete =
                  (status === "done" && true) ||
                  (currentIdx > -1 && idx < currentIdx);
                return (
                  <li key={step} className="flex items-center gap-3">
                    <StepDot
                      active={isActive}
                      complete={isComplete}
                      errored={status === "error" && idx === currentIdx}
                    />
                    <span
                      className={cn(
                        "text-[13px]",
                        isActive && "text-ink",
                        isComplete && "text-muted line-through decoration-line",
                        !isActive && !isComplete && "text-subtle"
                      )}
                    >
                      {STEP_LABELS[step]}
                    </span>
                  </li>
                );
              })}
            </ol>

            {isWorking && (
              <div className="mt-5 space-y-2.5">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow short />
              </div>
            )}

            <AnimatePresence>
              {stats && status === "done" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4"
                >
                  <StatCell label="Categories" value={stats.categories} />
                  <StatCell label="Items" value={stats.items} />
                  <StatCell label="Modifiers" value={stats.modifiers} />
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="mt-4 rounded-lg border border-danger/30 bg-danger/[0.06] p-3 text-xs text-danger">
                {error}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-line bg-elev p-5 shadow-sm">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
              How merge works
            </h3>
            <ul className="mt-3 space-y-2 text-[13px] text-muted">
              <li className="flex gap-2">
                <BulletDot /> Existing items update in place (description,
                price, modifiers).
              </li>
              <li className="flex gap-2">
                <BulletDot /> New categories &amp; items are created.
              </li>
              <li className="flex gap-2">
                <BulletDot /> Whole sync runs as one Postgres transaction — no
                orphaned rows.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
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
      <span className="grid h-5 w-5 place-items-center rounded-full border border-danger/40 bg-danger/10 text-danger">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </span>
    );
  }
  if (complete) {
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full border border-success/40 bg-success/10 text-success">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
      </span>
    );
  }
  if (active) {
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full border border-accent/40 bg-accent/10">
        <span className="block h-2 w-2 animate-pulse rounded-full bg-accent" />
      </span>
    );
  }
  return (
    <span className="grid h-5 w-5 place-items-center rounded-full border border-line bg-elev">
      <span className="block h-1.5 w-1.5 rounded-full bg-subtle/50" />
    </span>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-card p-3 shadow-sm">
      <div className="text-[10px] font-medium uppercase tracking-wider text-subtle">
        {label}
      </div>
      <div className="mt-1 font-mono-tabular text-xl font-semibold text-ink">
        {value}
      </div>
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
    <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-accent" />
  );
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
