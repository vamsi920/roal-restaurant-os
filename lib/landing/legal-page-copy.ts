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
    "ROAL uses guest name and phone to run pickup orders for your restaurant—not for unrelated marketing. Data stays in your account.",
    "Full policy (retention, subprocessors, requests) ships before general launch. Pilots get updates when it is ready.",
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
    "Pilot pricing, success fees, and support are agreed in writing before live calls—not inferred from this page.",
    "Written pilot terms supersede this draft. Full terms publish before general availability.",
  ],
  contactLead: "Questions about pilot terms?",
} as const;
