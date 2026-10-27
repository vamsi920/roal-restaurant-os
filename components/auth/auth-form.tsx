"use client";

import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Db } from "@/lib/db";
import { AuthField } from "@/components/auth/auth-field";
import { AuthFormStatus } from "@/components/auth/auth-form-status";
import { GoogleIcon } from "@/components/auth/google-icon";
import { authCallbackUrl, isGoogleProviderEnabled } from "@/components/auth/oauth";
import { TrialBanner } from "@/components/auth/trial-banner";
import { useResendCooldown } from "@/components/auth/use-resend-cooldown";
import { authCrossLinkNext, authHrefWithNext, defaultAuthNextPath } from "@/lib/auth/auth-next-url";
import { AUTH_ROUTES } from "@/lib/auth/auth-routes";
import {
  AUTH_NOT_CONFIGURED_MESSAGE,
  authErrorKind,
  formatAuthError,
  GOOGLE_DISABLED_MESSAGE,
  type AuthErrorKind,
} from "@/lib/auth/format-auth-error";
import { LOGIN_PAGE_COPY } from "@/lib/auth/login-page-copy";
import { safeNextPath } from "@/lib/auth/safe-next";
import { SIGNUP_ONBOARDING_NEXT, SIGNUP_PAGE_COPY } from "@/lib/auth/signup-page-copy";
import { cn } from "@/lib/cn";
import { createBrowserSupabase } from "@/lib/supabase/client";

type AuthMode = "sign_in" | "sign_up";

type Props = {
  mode: AuthMode;
  /** Set by the server page when a `roal_trial` cookie holds an unclaimed trial. */
  trial?: { restaurant: string | null } | null;
};

type Notice = { message: string; kind: AuthErrorKind; tone: "error" | "success" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function getSupabase(): Db | null {
  try {
    return createBrowserSupabase();
  } catch {
    return null;
  }
}

function errorNotice(raw: string | null | undefined): Notice {
  return { message: formatAuthError(raw), kind: authErrorKind(raw), tone: "error" };
}

export function AuthForm({ mode, trial = null }: Props) {
  const searchParams = useSearchParams();
  const isSignUp = mode === "sign_up";
  const hasTrial = Boolean(trial);
  // A pending trial is claimed on onboarding, so sign-in heads there too unless a deep link says otherwise.
  const fallbackNext = hasTrial ? SIGNUP_ONBOARDING_NEXT : defaultAuthNextPath(mode);
  const next = safeNextPath(searchParams.get("next"), fallbackNext);
  const urlError = searchParams.get("error");

  const copy = isSignUp ? SIGNUP_PAGE_COPY : LOGIN_PAGE_COPY;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | "resend" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(urlError ? errorNotice(urlError) : null);
  const [inboxFor, setInboxFor] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<"email" | "password" | null>(null);
  const cooldown = useResendCooldown(30);

  const titleId = useId();
  const leadId = useId();
  const statusId = useId();
  const emailId = useId();
  const passwordId = useId();
  const inboxTitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (inboxFor) inboxTitleRef.current?.focus();
  }, [inboxFor]);

  const loading = busy !== null;

  async function resendConfirmation(target: string) {
    const supabase = getSupabase();
    if (!supabase) {
      setNotice({ message: AUTH_NOT_CONFIGURED_MESSAGE, kind: "not_configured", tone: "error" });
      return;
    }
    setBusy("resend");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: target,
      options: { emailRedirectTo: authCallbackUrl(next) },
    });
    setBusy(null);
    if (error) {
      setNotice(errorNotice(error.message));
      return;
    }
    cooldown.start();
    setNotice({
      message: inboxFor ? SIGNUP_PAGE_COPY.confirm.resent : LOGIN_PAGE_COPY.form.resendSent,
      kind: "unknown",
      tone: "success",
    });
  }

  async function onGoogle() {
    setNotice(null);
    setBusy("google");
    const supabase = getSupabase();
    if (!supabase) {
      setBusy(null);
      setNotice({ message: AUTH_NOT_CONFIGURED_MESSAGE, kind: "not_configured", tone: "error" });
      return;
    }
    // Supabase answers a disabled provider with a raw JSON page, so check before leaving.
    const enabled = await isGoogleProviderEnabled();
    if (enabled === false) {
      setBusy(null);
      setNotice({ message: GOOGLE_DISABLED_MESSAGE, kind: "provider_disabled", tone: "error" });
      return;
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data?.url) {
      setBusy(null);
      setNotice(errorNotice(error?.message ?? "Google sign-in failed"));
      return;
    }
    // Keep the spinner while the browser leaves for Google.
    window.location.assign(data.url);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const submittedEmail = String(fd.get("email") ?? email).trim();
    const submittedPassword = String(fd.get("password") ?? password);

    if (!EMAIL_RE.test(submittedEmail)) {
      setInvalidField("email");
      setNotice({ message: "Enter a valid email address.", kind: "invalid_email", tone: "error" });
      return;
    }
    if (!submittedPassword) {
      setInvalidField("password");
      setNotice({ message: "Enter your password.", kind: "unknown", tone: "error" });
      return;
    }
    if (isSignUp && submittedPassword.length < MIN_PASSWORD) {
      setInvalidField("password");
      setNotice({
        message: `Use at least ${MIN_PASSWORD} characters for your password.`,
        kind: "weak_password",
        tone: "error",
      });
      return;
    }

    setInvalidField(null);
    setNotice(null);
    setBusy("email");

    const supabase = getSupabase();
    if (!supabase) {
      setBusy(null);
      setNotice({ message: AUTH_NOT_CONFIGURED_MESSAGE, kind: "not_configured", tone: "error" });
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: submittedEmail,
          password: submittedPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) {
          setBusy(null);
          setNotice(errorNotice(error.message));
          return;
        }
        // With confirmations on, Supabase hides existing accounts behind a user with no identities.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setBusy(null);
          setNotice(errorNotice("User already registered"));
          return;
        }
        if (data.session) {
          window.location.assign(next);
          return;
        }
        setBusy(null);
        setEmail(submittedEmail);
        setInboxFor(submittedEmail);
        cooldown.start();
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: submittedEmail,
        password: submittedPassword,
      });
      if (error) {
        setBusy(null);
        setNotice(errorNotice(error.message));
        return;
      }
      if (!data.session) {
        setBusy(null);
        setNotice(errorNotice("Email not confirmed"));
        return;
      }
      window.location.assign(next);
    } catch (err) {
      setBusy(null);
      setNotice(errorNotice(err instanceof Error ? err.message : "Failed to fetch"));
    }
  }

  const crossNext = hasTrial ? next : authCrossLinkNext(next, mode);
  const switchHref = isSignUp
    ? authHrefWithNext(AUTH_ROUTES.login, crossNext, "sign_in")
    : authHrefWithNext(AUTH_ROUTES.signup, crossNext, "sign_up");

  const trialBanner = trial ? (
    <TrialBanner
      restaurant={trial.restaurant ?? SIGNUP_PAGE_COPY.trialBanner.fallbackName}
      lead={copy.trialBanner.lead}
      tail={copy.trialBanner.tail}
      action={copy.trialBanner.action}
    />
  ) : null;

  if (inboxFor) {
    const c = SIGNUP_PAGE_COPY.confirm;
    const inboxTitleId = `${titleId}-inbox`;
    return (
      <div className="auth-stack">
        <section className="auth-card" aria-labelledby={inboxTitleId}>
          <span className="auth-icon-tile" aria-hidden>
            <MailCheck size={20} />
          </span>
          <h1 id={inboxTitleId} ref={inboxTitleRef} tabIndex={-1} className="auth-title font-display">
            {c.title}
          </h1>
          <p className="auth-lead">
            {c.lead} <strong className="auth-email">{inboxFor}</strong>. {c.afterConfirm}
          </p>

          <div className="auth-actions">
            <AuthFormStatus id={statusId} message={notice?.message ?? null} tone={notice?.tone} />
            <button
              type="button"
              className="btn-ghost btn-lg auth-btn-full"
              disabled={loading || !cooldown.ready}
              aria-busy={busy === "resend"}
              onClick={() => void resendConfirmation(inboxFor)}
            >
              {busy === "resend" ? (
                <>
                  <Loader2 size={16} className="auth-spin" aria-hidden /> {c.resending}
                </>
              ) : cooldown.ready ? (
                c.resend
              ) : (
                `${c.resendWait} ${cooldown.left}s`
              )}
            </button>
          </div>
          <p className="auth-fine">{c.spamHint}</p>
        </section>
        <p className="auth-switch">
          {c.wrongEmail}{" "}
          <button
            type="button"
            className="auth-link"
            onClick={() => {
              setInboxFor(null);
              setNotice(null);
            }}
          >
            {c.goBack}
          </button>
        </p>
      </div>
    );
  }

  const showResend = !isSignUp && notice?.kind === "email_not_confirmed";

  return (
    <div className="auth-stack">
      <section
        className={cn("auth-card", loading && "auth-card--busy")}
        aria-labelledby={titleId}
        aria-describedby={leadId}
      >
        {trialBanner}
        <h1 id={titleId} className="auth-title font-display">
          {copy.form.title}
        </h1>
        <p id={leadId} className="auth-lead">
          {copy.form.lead}
        </p>

        <button
          type="button"
          className="btn-ghost btn-lg auth-btn-full auth-btn-google"
          onClick={() => void onGoogle()}
          disabled={loading}
          aria-busy={busy === "google"}
        >
          {busy === "google" ? (
            <Loader2 size={18} className="auth-spin" aria-hidden />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </button>

        <div className="auth-divider" role="separator">
          <span>or</span>
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
            describedBy={notice ? statusId : undefined}
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
            describedBy={notice ? statusId : undefined}
            hint={isSignUp ? SIGNUP_PAGE_COPY.form.passwordHint : undefined}
            labelAside={
              isSignUp ? undefined : (
                <Link href={AUTH_ROUTES.resetPassword} className="auth-link auth-link--quiet">
                  {LOGIN_PAGE_COPY.form.forgotPasswordLink}
                </Link>
              )
            }
          />

          <AuthFormStatus
            id={statusId}
            message={notice?.message ?? null}
            tone={notice?.tone}
            action={
              showResend ? (
                <button
                  type="button"
                  className="auth-link"
                  disabled={loading || !cooldown.ready || !EMAIL_RE.test(email.trim())}
                  onClick={() => void resendConfirmation(email.trim())}
                >
                  {cooldown.ready ? LOGIN_PAGE_COPY.form.resendConfirm : `Resend in ${cooldown.left}s`}
                </button>
              ) : undefined
            }
          />

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
