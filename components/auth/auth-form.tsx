"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AuthFormStatus } from "@/components/auth/auth-form-status";
import { PublicFormField } from "@/components/landing/public";
import { cn } from "@/lib/cn";
import { createBrowserSupabase } from "@/lib/supabase/client";
import {
  authCrossLinkNext,
  authHrefWithNext,
  defaultAuthNextPath,
} from "@/lib/auth/auth-next-url";
import { safeNextPath } from "@/lib/auth/safe-next";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { AUTH_ROUTES } from "@/lib/auth/auth-routes";
import { LOGIN_PAGE_COPY } from "@/lib/auth/login-page-copy";
import { SIGNUP_PAGE_COPY } from "@/lib/auth/signup-page-copy";

type AuthMode = "sign_in" | "sign_up";
type SignInView = "sign_in" | "forgot" | "forgot_sent";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const searchParams = useSearchParams();
  const isSignUp = mode === "sign_up";
  const defaultNext = defaultAuthNextPath(mode);
  const next = safeNextPath(searchParams.get("next"), defaultNext);
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(
    urlError ? formatAuthError(urlError) : null
  );
  const [confirmSent, setConfirmSent] = useState(false);
  const [signInView, setSignInView] = useState<SignInView>("sign_in");

  const copy = isSignUp ? SIGNUP_PAGE_COPY : LOGIN_PAGE_COPY;
  const titleId = useId();
  const leadId = useId();
  const errorId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmTitleRef = useRef<HTMLHeadingElement>(null);
  const forgotSentTitleRef = useRef<HTMLHeadingElement>(null);

  const hasError = Boolean(message);

  useEffect(() => {
    if (confirmSent) {
      confirmTitleRef.current?.focus();
    }
  }, [confirmSent]);

  useEffect(() => {
    if (signInView === "forgot_sent") {
      forgotSentTitleRef.current?.focus();
    }
  }, [signInView]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const submittedEmail = String(fd.get("email") ?? email).trim();
    const submittedPassword = String(fd.get("password") ?? password);

    setLoading(true);
    setMessage(null);

    let supabase;
    try {
      supabase = createBrowserSupabase();
    } catch {
      setLoading(false);
      setMessage(
        "Sign-in is not configured on this server. Check Supabase URL and anon key in your environment."
      );
      return;
    }

    if (!isSignUp && signInView === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(submittedEmail, {
        redirectTo: `${window.location.origin}${AUTH_ROUTES.callback}?next=${encodeURIComponent(AUTH_ROUTES.resetPassword)}`,
      });
      setLoading(false);
      if (error) {
        setMessage(formatAuthError(error.message));
        return;
      }
      setEmail(submittedEmail);
      setSignInView("forgot_sent");
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email: submittedEmail,
        password: submittedPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setLoading(false);
      if (error) {
        setMessage(formatAuthError(error.message));
        return;
      }
      setConfirmSent(true);
      setEmail(submittedEmail);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: submittedEmail,
      password: submittedPassword,
    });
    if (error) {
      setLoading(false);
      setMessage(formatAuthError(error.message));
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    setLoading(false);
    if (!session) {
      setMessage(
        "Could not start your session. Confirm your email, then try signing in again."
      );
      return;
    }

    window.location.assign(next);
  }

  if (!isSignUp && signInView === "forgot_sent") {
    const forgot = LOGIN_PAGE_COPY.form;
    const forgotTitleId = `${titleId}-forgot-sent`;

    return (
      <section
        className="public-auth-panel public-auth-panel--success"
        role="status"
        aria-live="polite"
        aria-labelledby={forgotTitleId}
      >
        <h1
          id={forgotTitleId}
          ref={forgotSentTitleRef}
          tabIndex={-1}
          className="public-auth-panel__title"
        >
          {forgot.forgotSentTitle}
        </h1>
        <p className="public-auth-panel__lead">
          {forgot.forgotSentLead}{" "}
          <span className="font-medium text-ink">{email}</span>.
        </p>
        <p className="public-auth-confirm-hint">{forgot.forgotSentHint}</p>
        <button
          type="button"
          className="public-btn-primary public-auth-submit"
          onClick={() => setSignInView("sign_in")}
        >
          {forgot.forgotBackLabel}
        </button>
      </section>
    );
  }

  if (!isSignUp && signInView === "forgot") {
    const forgot = LOGIN_PAGE_COPY.form;

    return (
      <form
        method="post"
        onSubmit={onSubmit}
        className={cn("public-auth-panel", loading && "public-auth-panel--busy")}
        aria-labelledby={titleId}
      >
        <p className="public-auth-panel__eyebrow">Sign in</p>
        <h1 id={titleId} className="public-auth-panel__title">
          {forgot.forgotTitle}
        </h1>
        <p className="public-auth-panel__lead">{forgot.forgotLead}</p>

        <div className="public-form-fields">
          <PublicFormField
            id={emailId}
            name="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@restaurant.com"
            required
            autoComplete="email"
            disabled={loading}
            describedBy={hasError ? errorId : undefined}
          />
        </div>

        <AuthFormStatus id={errorId} message={message} />

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className={cn(
            "public-btn-primary public-auth-submit",
            loading && "public-auth-submit--busy"
          )}
        >
          {loading ? forgot.loadingLabel : forgot.forgotSubmitLabel}
        </button>

        <p className="public-auth-footer">
          <button
            type="button"
            className="public-blog-link font-medium"
            disabled={loading}
            onClick={() => {
              setSignInView("sign_in");
              setMessage(null);
            }}
          >
            {forgot.forgotBackLabel}
          </button>
        </p>
      </form>
    );
  }

  if (confirmSent) {
    const confirm = SIGNUP_PAGE_COPY.confirm;
    const confirmTitleId = `${titleId}-confirm`;

    return (
      <section
        className="public-auth-panel public-auth-panel--success"
        role="status"
        aria-live="polite"
        aria-labelledby={confirmTitleId}
      >
        <h1
          id={confirmTitleId}
          ref={confirmTitleRef}
          tabIndex={-1}
          className="public-auth-panel__title"
        >
          {confirm.title}
        </h1>
        <p className="public-auth-panel__lead">
          {confirm.lead}{" "}
          <span className="font-medium text-ink">{email}</span>. {confirm.afterConfirm}
        </p>
        <p className="public-auth-confirm-hint">{confirm.statusHint}</p>
        <Link
          href={authHrefWithNext("/login", next, "sign_in")}
          className="public-btn-primary public-auth-submit inline-flex w-full justify-center"
        >
          {confirm.backToSignIn}
        </Link>
        <p className="public-auth-trust">{SIGNUP_PAGE_COPY.form.trustLine}</p>
      </section>
    );
  }

  const passwordDescribedBy =
    isSignUp && "passwordHint" in copy.form
      ? `${passwordId}-hint ${hasError ? errorId : ""}`.trim()
      : hasError
        ? errorId
        : undefined;

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className={cn("public-auth-panel", loading && "public-auth-panel--busy")}
      aria-labelledby={titleId}
      aria-describedby={hasError ? errorId : leadId}
    >
      <p className="public-auth-panel__eyebrow">{copy.form.eyebrow}</p>
      <h1 id={titleId} className="public-auth-panel__title">
        {copy.form.title}
      </h1>
      <p id={leadId} className="public-auth-panel__lead">
        {copy.form.lead}
      </p>

      <div className="public-form-fields">
        <PublicFormField
          id={emailId}
          name="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@restaurant.com"
          required
          autoComplete="email"
          disabled={loading}
          describedBy={hasError ? errorId : undefined}
        />
        <PublicFormField
          id={passwordId}
          name="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder={copy.form.passwordPlaceholder}
          required
          autoComplete={isSignUp ? "new-password" : "current-password"}
          minLength={8}
          disabled={loading}
          describedBy={passwordDescribedBy}
          hint={isSignUp && "passwordHint" in copy.form ? copy.form.passwordHint : undefined}
        />
        {!isSignUp ? (
          <p className="public-auth-forgot-row">
            <button
              type="button"
              className="public-blog-link text-sm font-medium"
              disabled={loading}
              onClick={() => {
                setSignInView("forgot");
                setMessage(null);
              }}
            >
              {LOGIN_PAGE_COPY.form.forgotPasswordLink}
            </button>
          </p>
        ) : null}
      </div>

      <AuthFormStatus id={errorId} message={message} />

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className={cn(
          "public-btn-primary public-auth-submit",
          loading && "public-auth-submit--busy"
        )}
      >
        {loading ? copy.form.loadingLabel : copy.form.submitLabel}
      </button>

      <p className="public-auth-footer">
        {isSignUp ? (
          <>
            {SIGNUP_PAGE_COPY.footer.hasAccount}{" "}
            <Link
              href={authHrefWithNext(
                "/login",
                authCrossLinkNext(next, "sign_up"),
                "sign_in"
              )}
              className="public-blog-link font-medium"
            >
              {SIGNUP_PAGE_COPY.footer.signIn}
            </Link>
          </>
        ) : (
          <>
            {LOGIN_PAGE_COPY.footer.newHere}{" "}
            <Link
              href={authHrefWithNext(
                "/signup",
                authCrossLinkNext(next, "sign_in"),
                "sign_up"
              )}
              className="public-blog-link font-medium"
            >
              {LOGIN_PAGE_COPY.footer.createAccount}
            </Link>
          </>
        )}
      </p>

      {"trustLine" in copy.form ? (
        <p className="public-auth-trust">{copy.form.trustLine}</p>
      ) : null}
    </form>
  );
}
