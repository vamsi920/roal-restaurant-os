import { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-page-copy";

export const LEGAL_CONTACT_EMAIL = CONTACT_PILOT_EMAIL;

export const PRIVACY_PAGE_COPY = {
  draftNotice:
    "Draft policy only—not legal advice. A complete privacy policy will replace this page before general launch.",
  hero: {
    eyebrow: "Legal",
    title: "Privacy policy (draft)",
    description:
      "This page is a placeholder while we finalize formal privacy language for pilots. Contact us with questions anytime.",
  },
  updated: "Last updated: May 2026",
  paragraphs: [
    "ROAL collects guest names and phone numbers to run pickup orders for your restaurant—not to build unrelated marketing lists. Data stays scoped to your account and the tickets your team manages.",
    "Staff sign in with individual logins. We do not sell your menu, orders, or guest contact details to third parties.",
    "This draft will be replaced with a full policy covering retention, subprocessors, and data requests before wider launch. Pilot customers receive updates when that version ships.",
  ],
  contactLead: "Privacy questions for your pilot?",
} as const;

export const TERMS_PAGE_COPY = {
  draftNotice:
    "Pilot terms may vary by restaurant and are not legal advice. Your written pilot agreement controls pricing, success fees, and support—not this draft page.",
  hero: {
    eyebrow: "Legal",
    title: "Terms of service (draft)",
    description:
      "Pilot and early-access terms may vary by restaurant. This page is a placeholder until formal terms are published.",
  },
  updated: "Last updated: May 2026",
  paragraphs: [
    "ROAL is offered as a pilot for independent restaurants. Pricing, success fees, void/refund handling, and support windows are agreed in writing before you forward live guest calls—not inferred from this page.",
    "You keep control of your menu, phone forwarding, and staff handoffs. ROAL assists pickup orders; your team remains responsible for fulfillment and guest service on the pass.",
    "A signed or written pilot agreement supersedes this draft when terms conflict. We will publish complete terms of service before general availability.",
  ],
  contactLead: "Questions about pilot terms?",
} as const;
