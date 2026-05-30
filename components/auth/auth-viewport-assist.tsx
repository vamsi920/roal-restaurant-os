"use client";

import { useEffect } from "react";

function isFieldLike(target: EventTarget | null): target is HTMLElement {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLButtonElement
  );
}

/** Keeps focused fields visible when the mobile keyboard opens (visualViewport + scroll). */
export function AuthViewportAssist() {
  useEffect(() => {
    const main = document.getElementById("auth-main");
    if (!main) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!isFieldLike(target)) return;
      requestAnimationFrame(() => {
        target.scrollIntoView({
          block: "center",
          behavior: reducedMotion ? "auto" : "smooth",
        });
      });
    };

    main.addEventListener("focusin", onFocusIn);

    const viewport = window.visualViewport;
    if (!viewport) {
      return () => main.removeEventListener("focusin", onFocusIn);
    }

    const syncKeyboardInset = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      main.style.setProperty("--auth-keyboard-inset", `${Math.round(inset)}px`);
    };

    syncKeyboardInset();
    viewport.addEventListener("resize", syncKeyboardInset);
    viewport.addEventListener("scroll", syncKeyboardInset);

    return () => {
      main.removeEventListener("focusin", onFocusIn);
      viewport.removeEventListener("resize", syncKeyboardInset);
      viewport.removeEventListener("scroll", syncKeyboardInset);
      main.style.removeProperty("--auth-keyboard-inset");
    };
  }, []);

  return null;
}
