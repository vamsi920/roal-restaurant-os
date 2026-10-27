"use client";

import { Info, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthFormStatus } from "@/components/auth/auth-form-status";
import { GoogleIcon } from "@/components/auth/google-icon";
import { TrialBanner } from "@/components/auth/trial-banner";
import { authCrossLinkNext, authHrefWithNext, defaultAuthNextPath } from "@/lib/auth/auth-next-url";
import { AUTH_ROUTES } from "@/lib/auth/auth-routes";
import { authErrorKind, formatAuthError } from "@/lib/auth/format-auth-error";
import { AUTH_FORM_COPY, LOGIN_PAGE_COPY } from "@/lib/auth/login-page-copy";
import { safeNextPath } from "@/lib/auth/safe-next";
import { SIGNUP_ONBOARDING_NEXT, SIGNUP_PAGE_COPY } from "@/lib/auth/signup-page-copy";
import { cn } from "@/lib/cn";
import {
  CLIENT_DEMO_MODE,
  signInDemo,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/client";

type AuthMode = "sign_in" | "sign_up";

type Props = {
  mode: AuthMode;
  /** Set by the server page when a `roal_trial` cookie holds an unclaimed trial. */
  trial?: { restaurant: string | null } | null;
  /** Server decides demo mode (needs both client key and service account to be real). */
  demoMode?: boolean;
};

type Busy = "email" | "google" | "demo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/**
 * One card for sign-in and sign-up (Firebase Auth). Every path ends in
 * `window.location.assign(next)`: a full navigation, so server components read the
 * fresh httpOnly session cookie set by `/api/auth/session`.
 */
export function AuthForm({ mode, trial = null, demoMode = CLIENT_DEMO_MODE }: Props) {
  const searchParams = useSearchParams();
  const isSignUp = mode === "sign_up";
  const hasTrial = Boolean(trial);
  // A pending trial is claimed on onboarding, so sign-in heads there too unless a deep link says otherwise.
  const fallbackNext = hasTrial ? SIGNUP_ONBOARDING_NEXT : defaultAuthNextPath(mode);
  const next = safeNextPath(searchParams.get("next"), fallbackNext);
  const stale = searchParams.get("stale") === "1";
  const demo = demoMode;

  const copy = isSignUp ? SIGNUP_PAGE_COPY : LOGIN_PAGE_COPY;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState<Busy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<"email" | "password" | null>(null);

  const titleId = useId();
  const leadId = useId();
  const statusId = useId();
  const emailId = useId();
  const passwordId = useId();
  const rememberId = useId();
  const rememberHintId = useId();

  const loading = busy !== null;

  async function run(kind: Busy, action: () => Promise<void>) {
    setError(null);
    setBusy(kind);
    try {
      await action();
      // Keep the spinner while the browser loads the workspace.
      window.location.assign(next);
    } catch (err) {
      setBusy(null);
      const errKind = authErrorKind(err);
      if (errKind === "invalid_email" || errKind === "user_not_found" || errKind === "user_exists") {
        setInvalidField("email");
      } else if (errKind === "invalid_credentials" || errKind === "weak_password") {
        setInvalidField("password");
      }
      setError(formatAuthError(err));
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    if (demo) {
      void run("demo", signInDemo);
      return;
    }
    const fd = new FormData(e.currentTarget);
    const submittedEmail = String(fd.get("email") ?? email).trim();
    const submittedPassword = String(fd.get("password") ?? password);

    if (!EMAIL_RE.test(submittedEmail)) {
      setInvalidField("email");
      setError("Enter a valid email address.");
      return;
    }
    if (!submittedPassword) {
      setInvalidField("password");
      setError("Enter your password.");
      return;
    }
    if (isSignUp && submittedPassword.length < MIN_PASSWORD) {
      setInvalidField("password");
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }

    setInvalidField(null);
    void run("email", () =>
      signInWithEmail(submittedEmail, submittedPassword, { create: isSignUp, remember })
    );
  }

  const crossNext = hasTrial ? next : authCrossLinkNext(next, mode);
  const switchHref = isSignUp
    ? authHrefWithNext(AUTH_ROUTES.login, crossNext, "sign_in")
    : authHrefWithNext(AUTH_ROUTES.signup, crossNext, "sign_up");

  return (
    <div className="auth-stack">
      <section
        className={cn("auth-card", loading && "auth-card--busy")}
        aria-labelledby={titleId}
        aria-describedby={leadId}
      >
        {trial ? (
          <TrialBanner
            restaurant={trial.restaurant ?? SIGNUP_PAGE_COPY.trialBanner.fallbackName}
            lead={copy.trialBanner.lead}
            tail={copy.trialBanner.tail}
            action={copy.trialBanner.action}
          />
        ) : null}
        <h1 id={titleId} className="auth-title font-display">
          {copy.form.title}
        </h1>
        <p id={leadId} className="auth-lead">
          {copy.form.lead}
        </p>

        {stale && !isSignUp ? (
          <p className="auth-note" role="status">
            <Info size={15} aria-hidden className="auth-note__icon" />
            <span>{LOGIN_PAGE_COPY.form.staleSession}</span>
          </p>
        ) : null}

        {demo ? (
          <form method="post" noValidate onSubmit={onSubmit} className="auth-form auth-form--spaced" aria-labelledby={titleId}>
            <p className="auth-note auth-note--demo" role="note">
              <Sparkles size={15} aria-hidden className="auth-note__icon" />
              <span>{AUTH_FORM_COPY.demo.note}</span>
            </p>
            <AuthFormStatus id={statusId} message={error} />
            <button
              type="submit"
              disabled={loading}
              aria-busy={busy === "demo"}
              className="btn-primary btn-lg auth-btn-full"
            >
              {busy === "demo" ? (
                <>
                  <Loader2 size={16} className="auth-spin" aria-hidden /> {AUTH_FORM_COPY.demo.loadingLabel}
                </>
              ) : (
                AUTH_FORM_COPY.demo.submitLabel
              )}
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              className="btn-ghost btn-lg auth-btn-full auth-btn-google"
              onClick={() => void run("google", () => signInWithGoogle(remember))}
              disabled={loading}
              aria-busy={busy === "google"}
            >
              {busy === "google" ? <Loader2 size={18} className="auth-spin" aria-hidden /> : <GoogleIcon />}
              {busy === "google" ? AUTH_FORM_COPY.googleLoading : AUTH_FORM_COPY.google}
            </button>

            <div className="auth-divider" role="separator">
              <span>{AUTH_FORM_COPY.divider}</span>
            </div>

            <form method="post" noValidate onSubmit={onSubmit} className="auth-form" aria-labelledby={titleId}>
              <AuthField
                id={emailId}
                name="email"
                label="Email"
                type="email"
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  if (invalidField === "email") setInvalidField(null);
                }}
                placeholder="you@restaurant.com"
                required
                autoComplete="email"
                disabled={loading}
                invalid={invalidField === "email"}
                describedBy={error ? statusId : undefined}
              />
              <AuthField
                id={passwordId}
                name="password"
                label="Password"
                type="password"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  if (invalidField === "password") setInvalidField(null);
                }}
                placeholder={copy.form.passwordPlaceholder}
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={isSignUp ? MIN_PASSWORD : undefined}
                disabled={loading}
                invalid={invalidField === "password"}
                describedBy={error ? statusId : undefined}
                hint={isSignUp ? SIGNUP_PAGE_COPY.form.passwordHint : undefined}
                labelAside={
                  isSignUp ? undefined : (
                    <Link href={AUTH_ROUTES.resetPassword} className="auth-link auth-link--quiet">
                      {LOGIN_PAGE_COPY.form.forgotPasswordLink}
                    </Link>
                  )
                }
              />

              <div className="auth-remember">
                <input
                  id={rememberId}
                  type="checkbox"
                  className="auth-remember__box"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading}
                  aria-describedby={remember ? undefined : rememberHintId}
                />
                <label htmlFor={rememberId} className="auth-remember__label">
                  {AUTH_FORM_COPY.remember}
                </label>
                {remember ? null : (
                  <p id={rememberHintId} className="auth-remember__hint">
                    {AUTH_FORM_COPY.rememberHint}
                  </p>
                )}
              </div>

              <AuthFormStatus id={statusId} message={error} />

              <button
                type="submit"
                disabled={loading}
                aria-busy={busy === "email"}
                className="btn-primary btn-lg auth-btn-full"
              >
                {busy === "email" ? (
                  <>
                    <Loader2 size={16} className="auth-spin" aria-hidden /> {copy.form.loadingLabel}
                  </>
                ) : (
                  copy.form.submitLabel
                )}
              </button>
            </form>
          </>
        )}
      </section>

      <p className="auth-switch">
        {isSignUp ? SIGNUP_PAGE_COPY.footer.hasAccount : LOGIN_PAGE_COPY.footer.newHere}{" "}
        <Link href={switchHref} className="auth-link">
          {isSignUp ? SIGNUP_PAGE_COPY.footer.signIn : LOGIN_PAGE_COPY.footer.createAccount}
        </Link>
      </p>
    </div>
  );
}

export function AuthFormSkeleton() {
  return (
    <div className="auth-stack" aria-hidden>
      <div className="auth-card auth-card--skeleton" />
    </div>
  );
}
