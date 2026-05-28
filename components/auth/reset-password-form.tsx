"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AuthFormStatus } from "@/components/auth/auth-form-status";
import { PublicFormField } from "@/components/landing/public";
import { cn } from "@/lib/cn";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/auth/safe-next";
import { defaultAuthNextPath } from "@/lib/auth/auth-next-url";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { RESET_PASSWORD_PAGE_COPY } from "@/lib/auth/reset-password-copy";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), defaultAuthNextPath("sign_in"));
  const urlError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(
    urlError ? formatAuthError(urlError) : null
  );
  const [done, setDone] = useState(false);

  const copy = RESET_PASSWORD_PAGE_COPY.form;
  const titleId = useId();
  const errorId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const successTitleRef = useRef<HTMLHeadingElement>(null);
  const hasError = Boolean(message);

  useEffect(() => {
    if (done) {
      successTitleRef.current?.focus();
    }
  }, [done]);

  useEffect(() => {
    let cancelled = false;
    createBrowserSupabase()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        if (!session) {
          router.replace(
            `/login?error=${encodeURIComponent("Reset link expired or invalid. Request a new one from sign in.")}`
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          router.replace("/login");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirm) {
      setMessage(copy.mismatch);
      return;
    }

    setLoading(true);
    setMessage(null);

    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage(formatAuthError(error.message));
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <section
        className="public-auth-panel public-auth-panel--success"
        role="status"
        aria-live="polite"
        aria-labelledby={titleId}
      >
        <h1
          id={titleId}
          ref={successTitleRef}
          tabIndex={-1}
          className="public-auth-panel__title"
        >
          {copy.successTitle}
        </h1>
        <p className="public-auth-panel__lead">{copy.successLead}</p>
        <Link
          href={next}
          className="public-btn-primary public-auth-submit inline-flex w-full justify-center"
          onClick={(e) => {
            e.preventDefault();
            window.location.assign(next);
          }}
        >
          {copy.continueLabel}
        </Link>
      </section>
    );
  }

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className={cn("public-auth-panel", loading && "public-auth-panel--busy")}
      aria-labelledby={titleId}
      aria-describedby={hasError ? errorId : undefined}
    >
      <h1 id={titleId} className="public-auth-panel__title">
        {RESET_PASSWORD_PAGE_COPY.form.title}
      </h1>
      <p className="public-auth-panel__lead">{RESET_PASSWORD_PAGE_COPY.form.lead}</p>

      <div className="public-form-fields">
        <PublicFormField
          id={passwordId}
          name="password"
          label={copy.passwordLabel}
          type="password"
          value={password}
          onChange={setPassword}
          placeholder={copy.passwordPlaceholder}
          required
          autoComplete="new-password"
          minLength={8}
          disabled={loading}
          describedBy={`${passwordId}-hint${hasError ? ` ${errorId}` : ""}`}
          hint={copy.passwordHint}
        />
        <PublicFormField
          id={confirmId}
          name="confirm"
          label={copy.confirmLabel}
          type="password"
          value={confirm}
          onChange={setConfirm}
          placeholder={copy.passwordPlaceholder}
          required
          autoComplete="new-password"
          minLength={8}
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
        {loading ? copy.loadingLabel : copy.submitLabel}
      </button>

      <p className="public-auth-footer">
        <Link href="/login" className="public-blog-link font-medium">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
