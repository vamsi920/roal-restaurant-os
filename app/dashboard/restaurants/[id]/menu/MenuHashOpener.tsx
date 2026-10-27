"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

function revealSection(id: string, focus = false) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el instanceof HTMLDetailsElement) el.open = true;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  if (focus) {
    const target =
      el instanceof HTMLDetailsElement ? el.querySelector("summary") : el;
    (target as HTMLElement | null)?.focus({ preventScroll: true });
  }
}

/**
 * Opens a collapsed <details> section (scanner, copy, history) when the URL hash
 * points at it, so links like /menu#menu-scan land on an open panel.
 */
export function MenuHashOpener({ ids }: { ids: readonly string[] }) {
  useEffect(() => {
    function openFromHash() {
      const id = window.location.hash.replace(/^#/, "");
      if (!id || !ids.includes(id)) return;
      revealSection(id);
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [ids]);

  return null;
}

/** Header action that opens and scrolls to an on-page section (works on repeat clicks). */
export function MenuJumpLink({
  target,
  children,
  className,
}: {
  target: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={`#${target}`}
      className={cn("btn-ghost", className)}
      onClick={(e) => {
        e.preventDefault();
        window.history.replaceState(null, "", `#${target}`);
        revealSection(target, true);
      }}
    >
      {children}
    </a>
  );
}
