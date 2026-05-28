"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { PublicFormField } from "@/components/landing/public";
import { CONTACT_PAGE_COPY, CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-page-copy";
import {
  buildContactFormMailto,
  buildPilotMailto,
  contactFormCanSubmit,
} from "@/lib/landing/contact-mailto";

type FormState = {
  restaurant: string;
  email: string;
};

const INITIAL: FormState = {
  restaurant: "",
  email: "",
};

export function ContactPilotForm() {
  const form = CONTACT_PAGE_COPY.form;
  const fields = form.fields;
  const titleId = useId();
  const statusId = useId();
  const errorId = useId();
  const [values, setValues] = useState<FormState>(INITIAL);
  const [status, setStatus] = useState<"idle" | "mailto" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (status === "error") {
      setStatus("idle");
      setErrorMessage(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const check = contactFormCanSubmit(values);
    if (!check.ok) {
      setStatus("error");
      setErrorMessage(check.error ?? "Check the required fields.");
      return;
    }

    const mailtoHref = buildContactFormMailto(values);
    setStatus("mailto");
    setErrorMessage(null);
    window.location.assign(mailtoHref);
  }

  const showError = status === "error" && Boolean(errorMessage);

  return (
    <form
      id="contact-form"
      className="public-form-panel public-contact-form min-w-0 scroll-mt-28"
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby={titleId}
      aria-describedby={showError ? errorId : undefined}
    >
      <h2 id={titleId} className="public-form-panel__title text-balance">
        {form.title}
      </h2>
      <p className="public-form-panel__lead text-pretty">{form.description}</p>

      <p className="public-form-notice public-contact-form__notice">{form.staticNotice}</p>

      <div className="public-form-fields public-contact-form__fields">
        <PublicFormField
          id="contact-restaurant"
          name="restaurant"
          label={fields.restaurant.label}
          value={values.restaurant}
          onChange={(v) => update("restaurant", v)}
          placeholder={fields.restaurant.placeholder}
          required
          requiredStyle="asterisk"
          invalid={status === "error" && !values.restaurant.trim()}
          describedBy={showError ? errorId : undefined}
        />
        <PublicFormField
          id="contact-email"
          name="email"
          label={fields.email.label}
          type="email"
          value={values.email}
          onChange={(v) => update("email", v)}
          placeholder={fields.email.placeholder}
          required
          requiredStyle="asterisk"
          autoComplete="email"
          invalid={status === "error" && !values.email.trim()}
          describedBy={showError ? errorId : undefined}
        />
      </div>

      {showError ? (
        <p id={errorId} role="alert" className="public-form-error">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        className="public-btn-primary public-form-submit public-contact-form__submit w-full"
      >
        {form.submitLabel}
      </button>

      <p
        id={statusId}
        role="status"
        className="public-form-status public-contact-form__status"
        aria-live="polite"
      >
        {status === "mailto" ? (
          <>
            If email did not open, write to{" "}
            <a href={buildPilotMailto()} className="public-blog-link font-medium">
              {CONTACT_PILOT_EMAIL}
            </a>
            .
          </>
        ) : status === "error" ? (
          <>
            Or email{" "}
            <a href={buildPilotMailto()} className="public-blog-link font-medium">
              {CONTACT_PILOT_EMAIL}
            </a>
            .
          </>
        ) : (
          <>
            Opens your email to {CONTACT_PILOT_EMAIL}.{" "}
            <Link href="/demo" className="public-blog-link font-medium">
              Sample demo
            </Link>
            {" · "}
            <Link href="/signup?next=/dashboard/onboarding" className="public-blog-link font-medium">
              Self-serve setup
            </Link>
            .
          </>
        )}
      </p>
    </form>
  );
}
