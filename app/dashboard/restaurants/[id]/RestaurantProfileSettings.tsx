"use client";

import { useState, useTransition } from "react";
import { saveRestaurantProfileSettingsAction } from "./profile-actions";
import { cn } from "@/lib/cn";
import {
  UNAVAILABLE_ITEM_BEHAVIOR_LABEL,
  UNAVAILABLE_ITEM_BEHAVIORS,
} from "@/lib/restaurant-profile/handoff-rules";
import { RestaurantProfileInputSchema } from "@/lib/restaurant-profile/schema";
import { RestaurantKnowledgeEditor } from "@/components/restaurant-knowledge/RestaurantKnowledgeEditor";
import { RestaurantUpsellEditor } from "@/components/restaurant-upsell/RestaurantUpsellEditor";
import type {
  RestaurantKnowledgeFormEntry,
  RestaurantKnowledgeEntry,
} from "@/lib/restaurant-knowledge/schema";
import type { RestaurantUpsellFormEntry } from "@/lib/restaurant-upsell/schema";
import type { RestaurantUpsellRule } from "@/lib/restaurant-upsell/schema";
import type { RestaurantMenuSnapshot } from "@/lib/menu-editor/load-menu";
import type { Restaurant, RestaurantProfile } from "@/lib/types";

type Props = {
  restaurant: Restaurant;
  profile: RestaurantProfile;
  knowledgeEntries?: RestaurantKnowledgeEntry[];
  knowledgeBaseText?: string;
  upsellRules?: RestaurantUpsellRule[];
  upsellRulesText?: string;
  menu?: Pick<RestaurantMenuSnapshot, "categories" | "items" | "modifiers">;
};

function toKnowledgeFormEntries(
  entries: RestaurantKnowledgeEntry[]
): RestaurantKnowledgeFormEntry[] {
  return entries.map((entry) => ({
    category: entry.category,
    question: entry.question,
    answer: entry.answer,
    is_active: entry.is_active,
  }));
}

function toUpsellFormEntries(
  rules: RestaurantUpsellRule[]
): RestaurantUpsellFormEntry[] {
  return rules.map((rule) => ({
    trigger_text: rule.trigger_text,
    offer_text: rule.offer_text,
    is_active: rule.is_active,
  }));
}

function toFormState(
  restaurant: Restaurant,
  profile: RestaurantProfile
) {
  return {
    name: restaurant.name,
    phone: profile.phone ?? "",
    address_line1: profile.address_line1 ?? "",
    address_line2: profile.address_line2 ?? "",
    city: profile.city ?? "",
    region: profile.region ?? "",
    postal_code: profile.postal_code ?? "",
    country: profile.country ?? "US",
    timezone: profile.timezone ?? "America/Chicago",
    cuisine: profile.cuisine ?? "",
    website: profile.website ?? "",
    allows_pickup: profile.allows_pickup,
    allows_delivery: profile.allows_delivery,
    prep_time_minutes: String(profile.prep_time_minutes),
    tax_rate_percent: String(profile.tax_rate_percent),
    service_fee_percent: String(profile.service_fee_percent),
    escalation_name: profile.escalation_name ?? "",
    escalation_phone: profile.escalation_phone ?? "",
    escalation_email: profile.escalation_email ?? "",
    handoff_catering_route: profile.handoff_catering_route ?? "",
    handoff_complaint_route: profile.handoff_complaint_route ?? "",
    handoff_unavailable_item_behavior:
      profile.handoff_unavailable_item_behavior ?? "",
    handoff_unavailable_item_notes: profile.handoff_unavailable_item_notes ?? "",
    closed_hours_message: profile.closed_hours_message ?? "",
  };
}

export function RestaurantProfileSettings({
  restaurant,
  profile,
  knowledgeEntries = [],
  upsellRules = [],
  menu,
}: Props) {
  const [open, setOpen] = useState(true);
  const [form, setForm] = useState(() => toFormState(restaurant, profile));
  const [knowledgeFormEntries, setKnowledgeFormEntries] = useState(() =>
    toKnowledgeFormEntries(knowledgeEntries)
  );
  const [upsellFormEntries, setUpsellFormEntries] = useState(() =>
    toUpsellFormEntries(upsellRules)
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      name: form.name.trim(),
      phone: form.phone,
      address_line1: form.address_line1,
      address_line2: form.address_line2,
      city: form.city,
      region: form.region,
      postal_code: form.postal_code,
      country: form.country,
      timezone: form.timezone,
      cuisine: form.cuisine,
      website: form.website,
      allows_pickup: form.allows_pickup,
      allows_delivery: form.allows_delivery,
      prep_time_minutes: Number(form.prep_time_minutes),
      tax_rate_percent: Number(form.tax_rate_percent),
      service_fee_percent: Number(form.service_fee_percent),
      escalation_name: form.escalation_name,
      escalation_phone: form.escalation_phone,
      escalation_email: form.escalation_email,
      handoff_catering_route: form.handoff_catering_route,
      handoff_complaint_route: form.handoff_complaint_route,
      handoff_unavailable_item_behavior: form.handoff_unavailable_item_behavior,
      handoff_unavailable_item_notes: form.handoff_unavailable_item_notes,
      closed_hours_message: form.closed_hours_message,
      knowledge_entries: knowledgeFormEntries,
      upsell_entries: upsellFormEntries,
    };

    const parsed = RestaurantProfileInputSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid profile data");
      return;
    }

    startTransition(async () => {
      try {
        await saveRestaurantProfileSettingsAction(restaurant.id, parsed.data);
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <section className="glass-card overflow-hidden">
      <div className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 id="restaurant-profile-heading" className="text-sm font-semibold text-ink">
            Location settings
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Profile, ordering, taxes, and handoff rules synced to the voice agent.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-subtle hover:bg-elev hover:text-ink"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="restaurant-profile-panel"
          aria-labelledby="restaurant-profile-heading"
        >
          <svg
            viewBox="0 0 24 24"
            className={cn("h-5 w-5 transition-transform", open && "rotate-180")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="sr-only">{open ? "Collapse" : "Expand"} location settings</span>
        </button>
      </div>

      {open ? (
        <form
          id="restaurant-profile-panel"
          onSubmit={onSubmit}
          className="space-y-6 p-4 sm:p-5"
        >
          {error ? (
            <p className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          {saved && !pending ? (
            <p className="rounded-lg border border-success/25 bg-success/5 px-3 py-2 text-sm text-success">
              Settings saved.
            </p>
          ) : null}

          <FieldGroup title="Basics">
            <Field label="Restaurant name" required>
              <input
                className="input-base"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                required
                disabled={pending}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone">
                <input
                  className="input-base"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="+1 555 0100"
                  disabled={pending}
                />
              </Field>
              <Field label="Cuisine">
                <input
                  className="input-base"
                  value={form.cuisine}
                  onChange={(e) => setField("cuisine", e.target.value)}
                  placeholder="Italian, Pizza, …"
                  disabled={pending}
                />
              </Field>
            </div>
            <Field label="Website">
              <input
                className="input-base"
                type="url"
                value={form.website}
                onChange={(e) => setField("website", e.target.value)}
                placeholder="https://"
                disabled={pending}
              />
            </Field>
          </FieldGroup>

          <FieldGroup title="Address">
            <Field label="Street">
              <input
                className="input-base"
                value={form.address_line1}
                onChange={(e) => setField("address_line1", e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field label="Suite / unit">
              <input
                className="input-base"
                value={form.address_line2}
                onChange={(e) => setField("address_line2", e.target.value)}
                disabled={pending}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City">
                <input
                  className="input-base"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field label="State / region">
                <input
                  className="input-base"
                  value={form.region}
                  onChange={(e) => setField("region", e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field label="Postal code">
                <input
                  className="input-base"
                  value={form.postal_code}
                  onChange={(e) => setField("postal_code", e.target.value)}
                  disabled={pending}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Country">
                <input
                  className="input-base"
                  value={form.country}
                  onChange={(e) => setField("country", e.target.value.toUpperCase())}
                  maxLength={2}
                  disabled={pending}
                />
              </Field>
              <Field label="Timezone (IANA)" required>
                <input
                  className="input-base"
                  value={form.timezone}
                  onChange={(e) => setField("timezone", e.target.value)}
                  placeholder="America/Chicago"
                  required
                  disabled={pending}
                />
              </Field>
            </div>
          </FieldGroup>

          <FieldGroup title="Ordering">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.allows_pickup}
                  onChange={(e) => setField("allows_pickup", e.target.checked)}
                  disabled={pending}
                />
                Pickup
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.allows_delivery}
                  onChange={(e) => setField("allows_delivery", e.target.checked)}
                  disabled={pending}
                />
                Delivery
              </label>
            </div>
            <Field label="Avg prep time (minutes)" required>
              <input
                className="input-base max-w-[8rem]"
                type="number"
                min={5}
                max={240}
                value={form.prep_time_minutes}
                onChange={(e) => setField("prep_time_minutes", e.target.value)}
                required
                disabled={pending}
              />
            </Field>
          </FieldGroup>

          <FieldGroup title="Taxes & fees">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sales tax (%)">
                <input
                  className="input-base"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.tax_rate_percent}
                  onChange={(e) => setField("tax_rate_percent", e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field label="Service fee (%)">
                <input
                  className="input-base"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.service_fee_percent}
                  onChange={(e) => setField("service_fee_percent", e.target.value)}
                  disabled={pending}
                />
              </Field>
            </div>
          </FieldGroup>

          <FieldGroup title="Handoff &amp; escalation">
            <p className="-mt-2 text-xs text-muted">
              Routes catering, complaints, sold-out items, and after-hours calls.
              Synced to the voice agent on save.
            </p>

            <div className="rounded-xl border border-line bg-elev/40 p-3 sm:p-4">
              <p className="text-xs font-medium text-ink">Manager contact</p>
              <p className="mt-0.5 text-xs text-muted">
                Phone or email for staff callback when the agent escalates.
              </p>
              <div className="mt-3 space-y-3">
                <Field label="Manager name">
                  <input
                    className="input-base min-h-11"
                    value={form.escalation_name}
                    onChange={(e) =>
                      setField("escalation_name", e.target.value)
                    }
                    autoComplete="name"
                    disabled={pending}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Manager phone">
                    <input
                      className="input-base min-h-11"
                      type="tel"
                      inputMode="tel"
                      value={form.escalation_phone}
                      onChange={(e) =>
                        setField("escalation_phone", e.target.value)
                      }
                      placeholder="+1 555 0100"
                      autoComplete="tel"
                      disabled={pending}
                    />
                  </Field>
                  <Field label="Manager email">
                    <input
                      className="input-base min-h-11"
                      type="email"
                      inputMode="email"
                      value={form.escalation_email}
                      onChange={(e) =>
                        setField("escalation_email", e.target.value)
                      }
                      placeholder="manager@restaurant.com"
                      autoComplete="email"
                      disabled={pending}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <Field label="Catering route">
              <textarea
                className="input-base min-h-[5.5rem] resize-y"
                rows={3}
                value={form.handoff_catering_route}
                onChange={(e) =>
                  setField("handoff_catering_route", e.target.value)
                }
                placeholder="e.g. Take party size and date, offer manager callback within one business day. Do not quote catering pricing."
                disabled={pending}
              />
            </Field>

            <Field label="Complaint route">
              <textarea
                className="input-base min-h-[5.5rem] resize-y"
                rows={3}
                value={form.handoff_complaint_route}
                onChange={(e) =>
                  setField("handoff_complaint_route", e.target.value)
                }
                placeholder="e.g. Apologize, capture order number if any, offer manager callback—do not offer refunds on the call."
                disabled={pending}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Unavailable item behavior">
                <select
                  className="input-base min-h-11"
                  value={form.handoff_unavailable_item_behavior}
                  onChange={(e) =>
                    setField(
                      "handoff_unavailable_item_behavior",
                      e.target.value
                    )
                  }
                  disabled={pending}
                >
                  <option value="">Default (suggest alternative)</option>
                  {UNAVAILABLE_ITEM_BEHAVIORS.map((value) => (
                    <option key={value} value={value}>
                      {UNAVAILABLE_ITEM_BEHAVIOR_LABEL[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Extra note (optional)">
                <input
                  className="input-base min-h-11"
                  value={form.handoff_unavailable_item_notes}
                  onChange={(e) =>
                    setField("handoff_unavailable_item_notes", e.target.value)
                  }
                  placeholder="Short script for sold-out items"
                  disabled={pending}
                />
              </Field>
            </div>

            <Field label="Closed-hours message">
              <textarea
                className="input-base min-h-[5.5rem] resize-y"
                rows={3}
                value={form.closed_hours_message}
                onChange={(e) =>
                  setField("closed_hours_message", e.target.value)
                }
                placeholder="What to say when the guest calls outside your regular open hours (see Hours below)."
                disabled={pending}
              />
            </Field>
          </FieldGroup>

          <FieldGroup title="Guest knowledge &amp; FAQs">
            <RestaurantKnowledgeEditor
              entries={knowledgeFormEntries}
              onChange={(entries) => {
                setSaved(false);
                setKnowledgeFormEntries(entries);
              }}
              disabled={pending}
            />
          </FieldGroup>

          <FieldGroup title="Smart upsells">
            {menu ? (
              <RestaurantUpsellEditor
                entries={upsellFormEntries}
                menu={menu}
                onChange={(entries) => {
                  setSaved(false);
                  setUpsellFormEntries(entries);
                }}
                disabled={pending}
              />
            ) : (
              <p className="text-xs text-muted">
                Load the menu workspace to configure upsell rules against live items.
              </p>
            )}
          </FieldGroup>

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <button
              type="submit"
              className="btn-primary kds-thumb-btn min-h-11 w-full sm:w-auto"
              disabled={pending}
            >
              {pending ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
