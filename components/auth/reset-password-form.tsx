"use client";

import { CheckCircle2, KeyRound, Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthFormStatus } from "@/components/auth/auth-form-status";
import { authCallbackUrl } from "@/components/auth/oauth";
import { useResendCooldown } from "@/components/auth/use-resend-cooldown";
import { defaultAuthNextPath } from "@/lib/auth/auth-next-url";
import { AUTH_ROUTES } from "@/lib/auth/auth-routes";
import { AUTH_NOT_CONFIGURED_MESSAGE, formatAuthError } from "@/lib/auth/format-auth-error";
import {
  RESET_PASSWORD_PAGE_COPY,
  RESET_PASSWORD_UPDATE_PATH,
} from "@/lib/auth/reset-password-copy";
import { safeNextPath } from "@/lib/auth/safe-next";
import { cn } from "@/lib/cn";
import { createBrowserSupabase } from "@/lib/supabase/client";

type View = "checking" | "request" | "sent" | "update" | "done";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/**
 * `/reset-password` — two steps on one route:
 * 1. request: email → `resetPasswordForEmail` → recovery link to `/auth/callback?next=/reset-password?mode=update`
 * 2. update: the callback signed the user in, so `updateUser({ password })` sets the new one.
 */
export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const wantsUpdate = searchParams.get("mode") === "update";
  const next = safeNextPath(searchParams.get("next"), defaultAuthNextPath("sign_in"));
  const urlError = searchParams.get("error");

  const [view, setView] = useState<View>(wantsUpdate ? "checking" : "request");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(urlError ? formatAuthError(urlError) : null);
  const [invalidField, setInvalidField] = useState<"email" | "password" | "confirm" | null>(null);
  const cooldown = useResendCooldown(30);

  const req = RESET_PASSWORD_PAGE_COPY.request;
  const copy = RESET_PASSWORD_PAGE_COPY.form;
  const titleId = useId();
  const statusId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const focusRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    let supabase;
    try {
      supabase = createBrowserSupabase();
    } catch {
      setView("request");
      setMessage(AUTH_NOT_CONFIGURED_MESSAGE);
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        if (session) {
          setView("update");
        } else if (wantsUpdate) {
          setView("request");
          setMessage((m) => m ?? req.expired);
        }
      })
      .catch(() => {
        if (!cancelled && wantsUpdate) setView("request");
      });
    return () => {
      cancelled = true;
    };
  }, [wantsUpdate, req.expired]);

  useEffect(() => {
    if (view === "sent" || view === "done") focusRef.current?.focus();
  }, [view]);

  async function sendLink(target: string) {
    let supabase;
    try {
      supabase = createBrowserSupabase();
    } catch {
      setMessage(AUTH_NOT_CONFIGURED_MESSAGE);
      return false;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: authCallbackUrl(RESET_PASSWORD_UPDATE_PATH),
      });
      if (error) {
        setMessage(formatAuthError(error.message));
        return false;
      }
      cooldown.start();
      return true;
    } catch (err) {
      setMessage(formatAuthError(err instanceof Error ? err.message : "Failed to fetch"));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function onRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const target = email.trim();
    if (!EMAIL_RE.test(target)) {
      setInvalidField("email");
      setMessage("Enter a valid email address.");
      return;
    }
    setInvalidField(null);
    if (await sendLink(target)) {
      setSentTo(target);
      setView("sent");
    }
  }

  async function onUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setInvalidField("password");
      setMessage(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    if (password !== confirm) {
      setInvalidField("confirm");
      setMessage(copy.mismatch);
      return;
    }
    setInvalidField(null);
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await createBrowserSupabase().auth.updateUser({ password });
      if (error) {
        setMessage(formatAuthError(error.message));
        return;
      }
      setView("done");
    } catch (err) {
      setMessage(formatAuthError(err instanceof Error ? err.message : "Failed to fetch"));
    } finally {
      setLoading(false);
    }
  }

  const backLink = (
    <p className="auth-switch">
      {RESET_PASSWORD_PAGE_COPY.footer.remembered}{" "}
      <Link href={AUTH_ROUTES.login} className="auth-link">
        {RESET_PASSWORD_PAGE_COPY.footer.backToSignIn}
      </Link>
    </p>
  );

  if (view === "checking") {
    return (
      <div className="auth-stack" aria-busy>
        <div className="auth-card auth-card--skeleton" />
      </div>
    );
  }

  if (view === "done") {
    return (
      <div className="auth-stack">
        <section className="auth-card" aria-labelledby={titleId} role="status">
          <span className="auth-icon-tile auth-icon-tile--ok" aria-hidden>
            <CheckCircle2 size={20} />
          </span>
          <h1 id={titleId} ref={focusRef} tabIndex={-1} className="auth-title font-display">
            {copy.successTitle}
          </h1>
          <p className="auth-lead">{copy.successLead}</p>
          <div className="auth-actions">
            <a href={next} className="btn-primary btn-lg auth-btn-full">
              {copy.continueLabel}
            </a>
          </div>
        </section>
      </div>
    );
  }

  if (view === "sent") {
    return (
      <div className="auth-stack">
        <section className="auth-card" aria-labelledby={titleId}>
          <span className="auth-icon-tile" aria-hidden>
            <MailCheck size={20} />
          </span>
          <h1 id={titleId} ref={focusRef} tabIndex={-1} className="auth-title font-display">
            {req.sentTitle}
          </h1>
          <p className="auth-lead">
            {req.sentLead} <strong className="auth-email">{sentTo}</strong>, {req.sentTail}
          </p>
          <div className="auth-actions">
            <AuthFormStatus id={statusId} message={message} />
            <button
              type="button"
              className="btn-ghost btn-lg auth-btn-full"
              disabled={loading || !cooldown.ready}
              onClick={() => void sendLink(sentTo)}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="auth-spin" aria-hidden /> {req.loadingLabel}
                </>
              ) : cooldown.ready ? (
                "Resend link"
              ) : (
                `Resend in ${cooldown.left}s`
              )}
            </button>
          </div>
          <p className="auth-fine">{req.sentHint}</p>
        </section>
        <p className="auth-switch">
          <button
            type="button"
            className="auth-link"
            onClick={() => {
              setView("request");
              setMessage(null);
            }}
          >
            {req.tryAgain}
          </button>
        </p>
      </div>
    );
  }

  if (view === "update") {
    return (
      <div className="auth-stack">
        <section className={cn("auth-card", loading && "auth-card--busy")} aria-labelledby={titleId}>
          <span className="auth-icon-tile" aria-hidden>
            <KeyRound size={20} />
          </span>
          <h1 id={titleId} className="auth-title font-display">
            {copy.title}
          </h1>
          <p className="auth-lead">{copy.lead}</p>
          <form method="post" noValidate onSubmit={onUpdate} className="auth-form auth-form--spaced">
            <AuthField
              id={passwordId}
              name="password"
              label={copy.passwordLabel}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={copy.passwordPlaceholder}
              required
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              disabled={loading}
              invalid={invalidField === "password"}
              describedBy={message ? statusId : undefined}
              hint={copy.passwordHint}
              autoFocus
            />
            <AuthField
              id={confirmId}
              name="confirm"
              label={copy.confirmLabel}
              type="password"
              value={confirm}
              onChange={setConfirm}
              placeholder={copy.passwordPlaceholder}
              required
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              disabled={loading}
              invalid={invalidField === "confirm"}
              describedBy={message ? statusId : undefined}
            />
            <AuthFormStatus id={statusId} message={message} />
            <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary btn-lg auth-btn-full">
              {loading ? (
                <>
                  <Loader2 size={16} className="auth-spin" aria-hidden /> {copy.loadingLabel}
                </>
              ) : (
                copy.submitLabel
              )}
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-stack">
      <section className={cn("auth-card", loading && "auth-card--busy")} aria-labelledby={titleId}>
        <span className="auth-icon-tile" aria-hidden>
          <KeyRound size={20} />
        </span>
        <h1 id={titleId} className="auth-title font-display">
          {req.title}
        </h1>
        <p className="auth-lead">{req.lead}</p>
        <form method="post" noValidate onSubmit={onRequest} className="auth-form auth-form--spaced">
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
            describedBy={message ? statusId : undefined}
          />
          <AuthFormStatus id={statusId} message={message} />
          <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary btn-lg auth-btn-full">
            {loading ? (
              <>
                <Loader2 size={16} className="auth-spin" aria-hidden /> {req.loadingLabel}
              </>
            ) : (
              req.submitLabel
            )}
          </button>
        </form>
      </section>
      {backLink}
    </div>
  );
}
