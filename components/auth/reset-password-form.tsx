"use client";

import { KeyRound, Loader2, MailCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthFormStatus } from "@/components/auth/auth-form-status";
import { useResendCooldown } from "@/components/auth/use-resend-cooldown";
import { AUTH_ROUTES } from "@/lib/auth/auth-routes";
import { authErrorKind, formatAuthError } from "@/lib/auth/format-auth-error";
import { RESET_PASSWORD_PAGE_COPY } from "@/lib/auth/reset-password-copy";
import { cn } from "@/lib/cn";
import { CLIENT_DEMO_MODE, requestPasswordReset } from "@/lib/firebase/client";

type View = "request" | "sent";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * `/reset-password` — ask for an email, then Firebase sends the link and hosts the
 * "choose a new password" page (its continue URL returns to `/login`).
 * The confirmation is identical whether or not the account exists (no enumeration).
 */
export function ResetPasswordForm({ demoMode = CLIENT_DEMO_MODE }: { demoMode?: boolean } = {}) {
  const [view, setView] = useState<View>("request");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const cooldown = useResendCooldown(30);

  const copy = RESET_PASSWORD_PAGE_COPY.request;
  const titleId = useId();
  const statusId = useId();
  const emailId = useId();
  const focusRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (view === "sent") focusRef.current?.focus();
  }, [view]);

  async function sendLink(target: string): Promise<boolean> {
    setLoading(true);
    setMessage(null);
    try {
      if (!demoMode) await requestPasswordReset(target);
    } catch (err) {
      const kind = authErrorKind(err);
      // Unknown accounts look exactly like a sent email.
      if (kind !== "user_not_found" && kind !== "invalid_credentials") {
        if (kind === "invalid_email") setInvalid(true);
        setMessage(formatAuthError(err));
        setLoading(false);
        return false;
      }
    }
    setLoading(false);
    cooldown.start();
    return true;
  }

  async function onRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const target = email.trim();
    if (!EMAIL_RE.test(target)) {
      setInvalid(true);
      setMessage("Enter a valid email address.");
      return;
    }
    setInvalid(false);
    if (await sendLink(target)) {
      setSentTo(target);
      setView("sent");
    }
  }

  if (view === "sent") {
    return (
      <div className="auth-stack">
        <section className="auth-card" aria-labelledby={titleId}>
          <span className="auth-icon-tile" aria-hidden>
            <MailCheck size={20} />
          </span>
          <h1 id={titleId} ref={focusRef} tabIndex={-1} className="auth-title font-display">
            {copy.sentTitle}
          </h1>
          <p className="auth-lead">
            {copy.sentLead} <strong className="auth-email">{sentTo}</strong>, {copy.sentTail}
          </p>
          {demoMode ? (
            <p className="auth-note auth-note--demo" role="note">
              <Sparkles size={15} aria-hidden className="auth-note__icon" />
              <span>{copy.demoNote}</span>
            </p>
          ) : null}
          <div className="auth-actions">
            <AuthFormStatus id={statusId} message={message} />
            <Link href={AUTH_ROUTES.login} className="btn-primary btn-lg auth-btn-full">
              {RESET_PASSWORD_PAGE_COPY.footer.backToSignIn}
            </Link>
            <button
              type="button"
              className="btn-ghost btn-lg auth-btn-full"
              disabled={loading || !cooldown.ready}
              aria-busy={loading}
              onClick={() => void sendLink(sentTo)}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="auth-spin" aria-hidden /> {copy.loadingLabel}
                </>
              ) : cooldown.ready ? (
                copy.resend
              ) : (
                `${copy.resendWait} ${cooldown.left}s`
              )}
            </button>
          </div>
          <p className="auth-fine">{copy.sentHint}</p>
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
            {copy.tryAgain}
          </button>
        </p>
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
          {copy.title}
        </h1>
        <p className="auth-lead">{copy.lead}</p>
        <form method="post" noValidate onSubmit={onRequest} className="auth-form auth-form--spaced">
          <AuthField
            id={emailId}
            name="email"
            label="Email"
            type="email"
            value={email}
            onChange={(v) => {
              setEmail(v);
              if (invalid) setInvalid(false);
            }}
            placeholder="you@restaurant.com"
            required
            autoComplete="email"
            disabled={loading}
            invalid={invalid}
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
      <p className="auth-switch">
        {RESET_PASSWORD_PAGE_COPY.footer.remembered}{" "}
        <Link href={AUTH_ROUTES.login} className="auth-link">
          {RESET_PASSWORD_PAGE_COPY.footer.backToSignIn}
        </Link>
      </p>
    </div>
  );
}
