"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { claimTrialAction } from "@/app/dashboard/onboarding/actions";
import { formatSupabaseClientError } from "@/lib/dashboard/format-user-error";
import type { TrialPublicView } from "@/lib/trial/types";
import "@/components/try/trial.css";

type Props = { trial: TrialPublicView };

type ClaimStep = { label: string; status: "pending" | "running" | "done" | "failed" };

const STEPS: Array<ClaimStep["label"]> = [
  "Creating your workspace",
  "Saving menu, hours, and FAQs",
  "Provisioning your dedicated phone host",
  "Opening your dashboard",
];

/** After sign-up: promote the try-a-call trial into a real restaurant, automatically. */
export function ClaimTrialPanel({ trial }: Props) {
  const router = useRouter();
  const [steps, setSteps] = useState<ClaimStep[]>(STEPS.map((label) => ({ label, status: "pending" })));
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const started = useRef(false);

  const setStep = useCallback((index: number, status: ClaimStep["status"]) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, status } : i < index && status !== "failed" ? { ...s, status: "done" } : s)));
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setStep(0, "running");
    const ticker = setTimeout(() => setStep(1, "running"), 1200);
    const ticker2 = setTimeout(() => setStep(2, "running"), 3200);
    try {
      const result = await claimTrialAction({ trialId: trial.id });
      clearTimeout(ticker);
      clearTimeout(ticker2);
      setStep(3, "running");
      setSteps((prev) => prev.map((s, i) => (i < 3 ? { ...s, status: "done" } : s)));
      router.replace(`/dashboard/restaurants/${result.restaurantId}?welcome=1`);
    } catch (e) {
      clearTimeout(ticker);
      clearTimeout(ticker2);
      setSteps((prev) => prev.map((s) => (s.status === "running" ? { ...s, status: "failed" } : s)));
      setError(formatSupabaseClientError(e instanceof Error ? e.message : "Could not finish setup."));
      setRunning(false);
    }
  }, [router, setStep, trial.id]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  return (
    <div className="mx-auto max-w-xl">
      <div className="trial-building">
        <p className="chip chip--accent">Almost there</p>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink">
          Setting up {trial.restaurantName ?? "your restaurant"}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Everything {trial.persona.agentName} learned during your test call carries over.
        </p>
        <ol className="trial-steps">
          {steps.map((s, i) => (
            <li key={s.label} className={`trial-step trial-step--${s.status}`}>
              <span className="trial-step__icon" aria-hidden="true">
                {s.status === "done" ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4 4L19 7" /></svg>
                ) : s.status === "running" ? (
                  <span className="trial-step__spinner" />
                ) : s.status === "failed" ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                ) : (
                  <span className="tabular-nums">{i + 1}</span>
                )}
              </span>
              <span className="trial-step__title">{s.label}</span>
            </li>
          ))}
        </ol>
        {error ? (
          <div className="mt-4 space-y-3">
            <p className="trial-builder__error !mt-0" role="alert">
              {error}
            </p>
            <button type="button" className="btn-primary" onClick={run} disabled={running}>
              Try again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
