"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { PHONE_HOST_ADVANCED_ID, PHONE_HOST_ADVANCED_SECTIONS } from "./phone-host-ids";

/*
 * Small client helpers for the Phone host page. Layout primitives come from
 * components/ui and components/live-orders/workspace-ui; this file only adds the
 * bits that page needs on top (opening the collapsed Advanced area from a link,
 * sub-section headings inside it).
 */

/** Opens a collapsed <details> by id (and optionally a nested one), then scrolls to it. */
export function openPhoneHostSection(id: string = PHONE_HOST_ADVANCED_ID, focusId?: string) {
  if (typeof document === "undefined") return;
  const root = document.getElementById(id);
  if (root instanceof HTMLDetailsElement) root.open = true;
  const target = (focusId ? document.getElementById(focusId) : null) ?? root;
  if (!target) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  if (typeof history !== "undefined") history.replaceState(null, "", `#${focusId ?? id}`);
}

/** Anchor that also expands the Advanced CollapsiblePanel (a bare #hash would not). */
export function AdvancedLink({
  children,
  section,
  className,
}: {
  children: ReactNode;
  /** Optional sub-section id inside Advanced (e.g. "connection"). */
  section?: string;
  className?: string;
}) {
  return (
    <a
      href={`#${section ?? PHONE_HOST_ADVANCED_ID}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        openPhoneHostSection(PHONE_HOST_ADVANCED_ID, section);
      }}
    >
      {children}
    </a>
  );
}

/** Heading block for a sub-section inside the Advanced panel. */
export function AdvancedSection({
  id,
  title,
  hint,
  children,
  className,
}: {
  id: string;
  title: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("min-w-0 scroll-mt-24", className)}>
      <div className="mb-3 min-w-0">
        <h3 id={`${id}-title`} className="text-[13.5px] font-semibold text-ink">
          {title}
        </h3>
        {hint ? <p className="mt-0.5 text-[12.5px] text-subtle">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

const ADVANCED_HASHES = new Set<string>([PHONE_HOST_ADVANCED_ID, ...PHONE_HOST_ADVANCED_SECTIONS]);

/** Expands the Advanced panel when the URL hash points into it (deep links, back/forward). */
export function PhoneHostHashOpener() {
  useEffect(() => {
    function sync() {
      const hash = window.location.hash.replace(/^#/, "");
      if (!ADVANCED_HASHES.has(hash)) return;
      openPhoneHostSection(PHONE_HOST_ADVANCED_ID, hash === PHONE_HOST_ADVANCED_ID ? undefined : hash);
    }
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return null;
}
