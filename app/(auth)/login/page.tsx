import { Suspense } from "react";
import { AuthForm, AuthFormSkeleton } from "@/components/auth/auth-form";
import { readTrialHint } from "@/components/auth/trial-hint";
import { buildLoginPageMetadata } from "@/lib/auth/login-metadata";

export const metadata = buildLoginPageMetadata();

type Props = { searchParams: { mode?: string | string[] } };

/** `/login` — sign in; `/login?mode=signup` renders the create-account card on the same page. */
export default async function LoginPage({ searchParams }: Props) {
  const mode = searchParams.mode === "signup" ? "sign_up" : "sign_in";
  const trial = await readTrialHint();
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <AuthForm key={mode} mode={mode} trial={trial} />
    </Suspense>
  );
}
