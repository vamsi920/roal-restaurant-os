import { Suspense } from "react";
import { AuthForm, AuthFormSkeleton } from "@/components/auth/auth-form";
import { readTrialHint } from "@/components/auth/trial-hint";
import { buildSignupPageMetadata } from "@/lib/auth/signup-metadata";

export const metadata = buildSignupPageMetadata();

/** `/signup` — create account; defaults `next` to onboarding, which claims a pending trial. */
export default async function SignUpPage() {
  const trial = await readTrialHint();
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <AuthForm mode="sign_up" trial={trial} />
    </Suspense>
  );
}
