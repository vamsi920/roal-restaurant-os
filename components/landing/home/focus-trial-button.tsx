"use client";

import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Link to /try that, when the hero link input is on the page, scrolls to it and
 * focuses it instead. Works without JS (plain link).
 */
export function FocusTrialButton({ children, className }: { children: ReactNode; className?: string }) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    const input = document.getElementById("start-link-input");
    if (!(input instanceof HTMLInputElement) || input.disabled) return;
    e.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    input.closest("section")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => input.focus({ preventScroll: true }), reduced ? 0 : 550);
  }

  return (
    <a href="/try" className={cn(className)} onClick={onClick}>
      {children}
    </a>
  );
}
