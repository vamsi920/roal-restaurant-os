"use client";

import { useSearchParams } from "next/navigation";
import { defaultAuthNextPath } from "@/lib/auth/auth-next-url";
import { safeNextPath } from "@/lib/auth/safe-next";
import { SIGNUP_ONBOARDING_NEXT } from "@/lib/auth/signup-page-copy";
import { AuthForm } from "./auth-form";
import { SignupOnboardingAside } from "./signup-onboarding-aside";

/** `/signup` layout: onboarding story + account form (auth logic in AuthForm). */
export function SignupPageEntry() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), defaultAuthNextPath("sign_up"));
  const onboardingPath = next === SIGNUP_ONBOARDING_NEXT || next.startsWith(`${SIGNUP_ONBOARDING_NEXT}/`);

  return (
    <div className="public-signup-entry min-w-0">
      <div className="public-signup-entry__grid">
        <SignupOnboardingAside onboardingPath={onboardingPath} />
        <div className="public-signup-entry__form min-w-0">
          <AuthForm mode="sign_up" />
        </div>
      </div>
    </div>
  );
}

export function SignupPageSkeleton() {
  return (
    <div className="public-signup-entry min-w-0" aria-hidden>
      <div className="public-signup-entry__grid">
        <div className="public-signup-aside public-auth-panel--skeleton min-h-[22rem]" />
        <div className="public-auth-panel public-auth-panel--skeleton min-h-[22rem]" />
      </div>
    </div>
  );
}
