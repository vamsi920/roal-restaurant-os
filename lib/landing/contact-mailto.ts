/** Pilot inbox + mailto builders (single source for `/contact` CTAs). */

export const CONTACT_PILOT_EMAIL = "hello@getroal.com" as const;

const MAILTO_PREFIX = `mailto:${CONTACT_PILOT_EMAIL}`;

export type ContactFormMailtoInput = {
  restaurant: string;
  email: string;
  rushNotes?: string;
};

export function buildPilotMailto(options?: {
  subject?: string;
  body?: string;
}): string {
  const params = new URLSearchParams();
  if (options?.subject) params.set("subject", options.subject);
  if (options?.body) params.set("body", options.body);
  const query = params.toString();
  return query ? `${MAILTO_PREFIX}?${query}` : MAILTO_PREFIX;
}

export function buildContactFormMailto(input: ContactFormMailtoInput): string {
  const restaurant = input.restaurant.trim() || "Restaurant";
  const lines = [
    `Restaurant: ${input.restaurant.trim()}`,
    `Reply-to: ${input.email.trim()}`,
  ];
  const notes = input.rushNotes?.trim();
  if (notes) lines.push(`Rush-hour notes: ${notes}`);
  lines.push("", "(Sent from ROAL contact preview form — backend not connected yet.)");

  return buildPilotMailto({
    subject: `Book a ROAL demo — ${restaurant}`,
    body: lines.join("\n"),
  });
}

/** Basic check before opening mailto (HTML5 `type=email` is not enough in all browsers). */
export function isValidContactEmail(email: string): boolean {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function contactFormCanSubmit(values: ContactFormMailtoInput): {
  ok: boolean;
  error?: string;
} {
  if (!values.restaurant.trim()) {
    return { ok: false, error: "Enter your restaurant name." };
  }
  if (!values.email.trim()) {
    return { ok: false, error: "Enter your email so we can reply." };
  }
  if (!isValidContactEmail(values.email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  return { ok: true };
}

/** Ensures mailto CTAs never drift to another inbox. */
export function mailtoUsesPilotInbox(href: string): boolean {
  return href.startsWith(MAILTO_PREFIX);
}
