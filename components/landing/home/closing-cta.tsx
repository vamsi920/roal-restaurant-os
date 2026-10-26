"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";

/**
 * Closing CTA that repeats the hero input. Submitting hands the typed value to the
 * hero's TrialBuilder (same page) so there is one trial per page, then scrolls up.
 * If the hero input is not on the page, it falls back to /try.
 */
export function ClosingCta() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = value.trim();
    const heroInput = document.getElementById("trial-input");
    if (!(heroInput instanceof HTMLInputElement) || heroInput.disabled) {
      router.push("/try");
      return;
    }
    if (text) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(heroInput, text);
      heroInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heroInput.closest("section")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => heroInput.focus({ preventScroll: true }), reduced ? 0 : 500);
  }

  return (
    <section className="closer" aria-labelledby="closer-title">
      <div className="hero__glow" aria-hidden />
      <div className="wrap relative">
        <div className="mx-auto max-w-2xl reveal">
          <p className="eyebrow justify-center">Try it now</p>
          <h2 id="closer-title" className="h1 mt-4">
            Hear your own phone host in about a minute.
          </h2>
          <p className="lead mt-4">
            Paste your link. Call it. Keep it if you like it. {PRICING_RATE_AMOUNT} per completed order, nothing otherwise.
          </p>
        </div>
        <form className="closer__builder trial-form reveal" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="closer-input">
            Restaurant website, Google Maps link, or name and city
          </label>
          <div className="trial-form__row">
            <span className="trial-form__icon" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
                <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
              </svg>
            </span>
            <input
              id="closer-input"
              className="trial-form__input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="yourrestaurant.com or a Google Maps link"
              autoComplete="off"
              spellCheck={false}
              inputMode="url"
            />
            <button type="submit" className="btn-primary btn-lg trial-form__submit">
              Build my phone host
            </button>
          </div>
          <p className="trial-form__examples">
            No sign-up. We only read public pages.
          </p>
        </form>
      </div>
    </section>
  );
}
