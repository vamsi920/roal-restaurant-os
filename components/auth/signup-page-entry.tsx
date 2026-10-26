"use client";

import { useSearchParams } from "next/navigation";
import { defaultAuthNextPath } from "@/lib/auth/auth-next-url";
import { safeNextPath } from "@/lib/auth/safe-next";
import { SIGNUP_ONBOARDING_NEXT, SIGNUP_PAGE_COPY } from "@/lib/auth/signup-page-copy";
import { AuthForm } from "./auth-form";

/** `/signup` layout: short onboarding story + account form (auth logic in AuthForm). */
export function SignupPageEntry() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), defaultAuthNextPath("sign_up"));
  const onboardingPath = next === SIGNUP_ONBOARDING_NEXT || next.startsWith(`${SIGNUP_ONBOARDING_NEXT}/`);
  const { entry, steps, asideNote } = SIGNUP_PAGE_COPY;

  return (
    <>
      <aside className="auth-aside">
        <p className="eyebrow">{entry.eyebrow}</p>
        <h2 className="h2 mt-3">{entry.title}</h2>
        <p className="lead mt-3">{entry.description}</p>
        <ul className="auth-aside__list">
          {steps.map((step, i) => (
            <li key={step.title}>
              <span className="auth-aside__num" aria-hidden>
                {i + 1}
              </span>
              <div className="min-w-0">
                <strong>{step.title}</strong>
                <span>{step.tag}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="auth-hint">{onboardingPath ? asideNote.onboardingPath : asideNote.default}</p>
      </aside>
      <div className="w-full min-w-0">
        <AuthForm mode="sign_up" />
      </div>
    </>
  );
}

export function SignupPageSkeleton() {
  return (
    <>
      <div className="auth-aside auth-panel auth-panel--skeleton min-h-[18rem]" aria-hidden />
      <div className="auth-panel auth-panel--skeleton min-h-[22rem] w-full" aria-hidden />
    </>
  );
}
