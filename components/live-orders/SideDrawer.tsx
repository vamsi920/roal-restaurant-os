"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Right-hand drawer on tablet/desktop, bottom sheet on phones.
 * Headless UI handles Esc-to-close, the focus trap, and returning focus to the
 * element that opened it; the close button takes focus when it opens.
 */
export function SideDrawer({
  open,
  onClose,
  title,
  subtitle,
  badge,
  footer,
  children,
  titleId,
  closeLabel = "Close",
  widthClassName = "sm:max-w-[30rem]",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  titleId?: string;
  closeLabel?: string;
  widthClassName?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-ink/25 transition-opacity duration-200 data-[closed]:opacity-0 motion-reduce:transition-none"
      />
      <div className="fixed inset-0 flex items-end justify-end sm:items-stretch">
        <DialogPanel
          transition
          className={cn(
            "flex max-h-[92dvh] w-full min-w-0 flex-col overflow-hidden rounded-t-[18px] border border-line bg-card shadow-lg",
            "transition duration-200 ease-out data-[closed]:translate-y-6 data-[closed]:opacity-0",
            "sm:h-full sm:max-h-none sm:rounded-none sm:rounded-l-[18px] sm:border-y-0 sm:border-r-0 sm:data-[closed]:translate-x-8 sm:data-[closed]:translate-y-0",
            "motion-reduce:transition-none",
            widthClassName
          )}
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden />
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 pb-4 pt-3 sm:pt-5">
            <div className="min-w-0">
              <DialogTitle
                id={titleId}
                className="font-display text-[19px] font-bold leading-tight tracking-[-0.01em] text-ink [overflow-wrap:anywhere]"
              >
                {title}
              </DialogTitle>
              {subtitle ? <p className="mt-1 text-[13px] text-subtle [overflow-wrap:anywhere]">{subtitle}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {badge}
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="grid h-11 w-11 place-items-center rounded-[10px] border border-line bg-card text-muted transition-colors hover:bg-elev hover:text-ink sm:h-9 sm:w-9"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
          {footer ? (
            <footer className="shrink-0 border-t border-line bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </footer>
          ) : null}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

/** Section heading used inside drawers. */
export function DrawerSection({
  title,
  action,
  children,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-6 first:mt-0", className)}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-subtle">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
