"use client";

import { useState, useTransition, type ReactNode } from "react";
import { MessageCircleQuestion, PhoneForwarded, Sparkles, Store } from "lucide-react";
import { saveRestaurantProfileSettingsAction } from "./profile-actions";
import { SaveRow } from "@/components/live-orders/workspace-ui";
import { CheckRow, Field, SettingsPanel, SubHeading } from "./menu/menu-ui";
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
  /** Rendered between Business info and FAQs (the Hours panel on the Menu page). */
  hoursSlot?: ReactNode;
};

type SectionKey = "business" | "handoff" | "faqs" | "upsells";

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
  hoursSlot,
}: Props) {
  const [form, setForm] = useState(() => toFormState(restaurant, profile));
  const [knowledgeFormEntries, setKnowledgeFormEntries] = useState(() =>
    toKnowledgeFormEntries(knowledgeEntries)
  );
  const [upsellFormEntries, setUpsellFormEntries] = useState(() =>
    toUpsellFormEntries(upsellRules)
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [dirty, setDirty] = useState<Set<SectionKey>>(new Set());
  const [pending, startTransition] = useTransition();

  function markDirty(section: SectionKey) {
    setSaved(false);
    setDirty((prev) => (prev.has(section) ? prev : new Set(prev).add(section)));
  }

  function setField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
    section: SectionKey = "business"
  ) {
    markDirty(section);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(section: SectionKey) {
    setError(null);
    setActiveSection(section);

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

    // One action saves the whole location profile (details, handoff, FAQs, upsells),
    // so every section's Save button persists all pending edits together.
    startTransition(async () => {
      try {
        await saveRestaurantProfileSettingsAction(restaurant.id, parsed.data);
        setSaved(true);
        setDirty(new Set());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  function onSubmit(section: SectionKey) {
    return (e: React.FormEvent) => {
      e.preventDefault();
      submit(section);
    };
  }

  function footer(section: SectionKey, label: string) {
    const isActive = activeSection === section;
    const otherDirty = [...dirty].some((k) => k !== section);
    let message: ReactNode = null;
    let tone: "ok" | "bad" | "muted" = "muted";
    if (isActive && error) {
      message = error;
      tone = "bad";
    } else if (isActive && saved && !pending) {
      message = "Saved. Your phone host picks this up in about a minute.";
      tone = "ok";
    } else if (dirty.has(section)) {
      message = otherDirty
        ? "Unsaved changes here and in other sections — saving keeps them all."
        : "Unsaved changes";
    }
    return (
      <SaveRow message={message} tone={tone} className="mt-5">
        <button
          type="submit"
          className="btn-primary w-full sm:w-auto"
          disabled={pending}
          aria-busy={pending && isActive}
        >
          {pending && isActive ? "Saving…" : label}
        </button>
      </SaveRow>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit("business")}>
        <SettingsPanel
          id="restaurant-business-info"
          icon={Store}
          color="blue"
          title="Business info"
          titleId="restaurant-profile-heading"
          description="Name, address, ordering, taxes and fees the phone host quotes to guests."
        >
          <div className="space-y-6">
            <FieldGroup title="Basics">
              <Field label="Restaurant name" required>
                <input
                  className="input-base"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  required
                  autoComplete="organization"
                  disabled={pending}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone">
                  <input
                    className="input-base"
                    type="tel"
                    inputMode="tel"
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
                  inputMode="url"
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
                  autoComplete="address-line1"
                  disabled={pending}
                />
              </Field>
              <Field label="Suite / unit">
                <input
                  className="input-base"
                  value={form.address_line2}
                  onChange={(e) => setField("address_line2", e.target.value)}
                  autoComplete="address-line2"
                  disabled={pending}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="City">
                  <input
                    className="input-base"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    autoComplete="address-level2"
                    disabled={pending}
                  />
                </Field>
                <Field label="State / region">
                  <input
                    className="input-base"
                    value={form.region}
                    onChange={(e) => setField("region", e.target.value)}
                    autoComplete="address-level1"
                    disabled={pending}
                  />
                </Field>
                <Field label="Postal code">
                  <input
                    className="input-base"
                    value={form.postal_code}
                    onChange={(e) => setField("postal_code", e.target.value)}
                    autoComplete="postal-code"
                    disabled={pending}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Country" hint="Two-letter code, e.g. US">
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
              <div className="flex flex-wrap gap-x-6">
                <CheckRow
                  checked={form.allows_pickup}
                  onChange={(v) => setField("allows_pickup", v)}
                  label="Pickup"
                  disabled={pending}
                />
                <CheckRow
                  checked={form.allows_delivery}
                  onChange={(v) => setField("allows_delivery", v)}
                  label="Delivery"
                  disabled={pending}
                />
              </div>
              <Field label="Avg prep time (minutes)" required className="max-w-[12rem]">
                <input
                  className="input-base tabular-nums"
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
                    className="input-base tabular-nums"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    inputMode="decimal"
                    value={form.tax_rate_percent}
                    onChange={(e) => setField("tax_rate_percent", e.target.value)}
                    disabled={pending}
                  />
                </Field>
                <Field label="Service fee (%)">
                  <input
                    className="input-base tabular-nums"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    inputMode="decimal"
                    value={form.service_fee_percent}
                    onChange={(e) => setField("service_fee_percent", e.target.value)}
                    disabled={pending}
                  />
                </Field>
              </div>
            </FieldGroup>
          </div>
          {footer("business", "Save business info")}
        </SettingsPanel>
      </form>

      {hoursSlot}

      <form onSubmit={onSubmit("faqs")}>
        <SettingsPanel
          id="restaurant-faqs"
          icon={MessageCircleQuestion}
          color="green"
          title="FAQs"
          titleId="restaurant-faqs-heading"
          description="Approved answers for parking, allergens, catering, refunds and more."
        >
          <RestaurantKnowledgeEditor
            entries={knowledgeFormEntries}
            onChange={(entries) => {
              markDirty("faqs");
              setKnowledgeFormEntries(entries);
            }}
            disabled={pending}
          />
          {footer("faqs", "Save FAQs")}
        </SettingsPanel>
      </form>

      <form onSubmit={onSubmit("upsells")}>
        <SettingsPanel
          id="restaurant-upsells"
          icon={Sparkles}
          color="orange"
          title="Upsells"
          titleId="restaurant-upsells-heading"
          description="One short add-on offer while a guest is ordering — only for items in stock."
        >
          {menu ? (
            <RestaurantUpsellEditor
              entries={upsellFormEntries}
              menu={menu}
              onChange={(entries) => {
                markDirty("upsells");
                setUpsellFormEntries(entries);
              }}
              disabled={pending}
            />
          ) : (
            <p className="text-[13px] text-subtle">
              Load the menu workspace to configure upsell rules against live items.
            </p>
          )}
          {footer("upsells", "Save upsells")}
        </SettingsPanel>
      </form>

      <form onSubmit={onSubmit("handoff")}>
        <SettingsPanel
          id="restaurant-handoff"
          icon={PhoneForwarded}
          color="rose"
          title="Handoff"
          titleId="restaurant-handoff-heading"
          description="Who the phone host escalates to, and how it handles catering, complaints, sold-out items and after-hours calls."
        >
          <div className="space-y-6">
            <FieldGroup title="Manager contact">
              <p className="-mt-1 text-[12.5px] text-subtle">
                Phone or email for staff callback when the host escalates.
              </p>
              <Field label="Manager name">
                <input
                  className="input-base"
                  value={form.escalation_name}
                  onChange={(e) => setField("escalation_name", e.target.value, "handoff")}
                  autoComplete="name"
                  disabled={pending}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Manager phone">
                  <input
                    className="input-base"
                    type="tel"
                    inputMode="tel"
                    value={form.escalation_phone}
                    onChange={(e) => setField("escalation_phone", e.target.value, "handoff")}
                    placeholder="+1 555 0100"
                    autoComplete="tel"
                    disabled={pending}
                  />
                </Field>
                <Field label="Manager email">
                  <input
                    className="input-base"
                    type="email"
                    inputMode="email"
                    value={form.escalation_email}
                    onChange={(e) => setField("escalation_email", e.target.value, "handoff")}
                    placeholder="manager@restaurant.com"
                    autoComplete="email"
                    disabled={pending}
                  />
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup title="Routing rules">
              <Field label="Catering route">
                <textarea
                  className="input-base resize-y"
                  rows={3}
                  value={form.handoff_catering_route}
                  onChange={(e) => setField("handoff_catering_route", e.target.value, "handoff")}
                  placeholder="e.g. Take party size and date, offer manager callback within one business day. Do not quote catering pricing."
                  disabled={pending}
                />
              </Field>

              <Field label="Complaint route">
                <textarea
                  className="input-base resize-y"
                  rows={3}
                  value={form.handoff_complaint_route}
                  onChange={(e) => setField("handoff_complaint_route", e.target.value, "handoff")}
                  placeholder="e.g. Apologize, capture order number if any, offer manager callback—do not offer refunds on the call."
                  disabled={pending}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Unavailable item behavior">
                  <select
                    className="input-base"
                    value={form.handoff_unavailable_item_behavior}
                    onChange={(e) =>
                      setField("handoff_unavailable_item_behavior", e.target.value, "handoff")
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
                    className="input-base"
                    value={form.handoff_unavailable_item_notes}
                    onChange={(e) =>
                      setField("handoff_unavailable_item_notes", e.target.value, "handoff")
                    }
                    placeholder="Short script for sold-out items"
                    disabled={pending}
                  />
                </Field>
              </div>

              <Field label="Closed-hours message">
                <textarea
                  className="input-base resize-y"
                  rows={3}
                  value={form.closed_hours_message}
                  onChange={(e) => setField("closed_hours_message", e.target.value, "handoff")}
                  placeholder="What to say when the guest calls outside your regular open hours (see Hours above)."
                  disabled={pending}
                />
              </Field>
            </FieldGroup>
          </div>
          {footer("handoff", "Save handoff")}
        </SettingsPanel>
      </form>
    </div>
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
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-3 w-full">
        <SubHeading>{title}</SubHeading>
      </legend>
      {children}
    </fieldset>
  );
}
