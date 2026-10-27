"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import "@/components/try/trial.css";

const EXAMPLES = ["joespizzanyc.com", "Taqueria Sol, Austin"];

/** Homepage "paste your link" input: opens the /try funnel with the link prefilled. */
export function StartLinkForm({ autofocus = false, className }: { autofocus?: boolean; className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [going, setGoing] = useState(false);

  const submit = (q: string) => {
    const v = q.trim();
    if (!v) return;
    setGoing(true);
    router.push(`/try?q=${encodeURIComponent(v)}`);
  };

  return (
    <form
      className={cn("trial-form", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
    >
      <label className="sr-only" htmlFor="start-link-input">
        Restaurant website, Google Maps link, or name and city
      </label>
      <div className="trial-form__row">
        <span className="trial-form__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
        </span>
        <input
          id="start-link-input"
          className="trial-form__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste your website or Google Maps link"
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
          autoFocus={autofocus}
          disabled={going}
        />
        <button type="submit" className="btn-primary btn-lg trial-form__submit" disabled={going || !value.trim()}>
          <span className="trial-form__submit-label">{going ? "Opening…" : "Try it free"}</span>
          {!going ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13m-5-5 5 5-5 5" /></svg>
          ) : null}
        </button>
      </div>
      <p className="trial-form__examples">
        Try:
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="trial-form__example" onClick={() => submit(ex)} disabled={going}>
            {ex}
          </button>
        ))}
      </p>
    </form>
  );
}
