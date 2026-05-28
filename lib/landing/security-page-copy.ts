/** Plain-language security copy for `/security`. */

import { publicHomeHash } from "@/lib/landing/public-links";
import { PUBLIC_CTA_PAIR } from "@/lib/landing/public-cta";

export const SECURITY_PAGE_COPY = {
  hero: {
    eyebrow: "Security",
    title: "Guest info stays yours. Your team stays in charge.",
    description: "Guest name and phone for pickup only. Your menu and tickets stay in your account.",
  },
  pillars: {
    titleId: "security-pillars-heading",
    eyebrow: "How we protect you",
    title: "Five things owners ask about",
    description: "Access, guest data, handoffs, and verified phone orders.",
  },
  goLive: {
    titleId: "security-golive-heading",
    title: "Before you forward live guest calls",
    description:
      "A short checklist we walk through on every pilot—plain steps, no IT degree required.",
  },
  technical: {
    titleId: "security-technical-heading",
    eyebrow: "For your tech team",
    title: "Implementation details",
    description:
      "Share this section with whoever manages your database, voice vendor, or deployment—RLS, tokens, and audit tables live here.",
  },
  aeo: {
    question: "How does ROAL protect restaurant guest data?",
    answer:
      "Guest names and phone numbers stay in your restaurant account for pickup orders only. Staff use their own logins, orders are logged for review, humans can take over any call, and phone orders are verified per shop.",
  },
  faq: {
    titleId: "security-faq-heading",
    title: "Security questions owners ask",
    description: "Guest data, access, handoffs, and phone-order safety.",
  },
  roadmap: {
    titleId: "security-roadmap-heading",
    title: "Coming for larger groups",
    description:
      "Features multi-location operators and compliance reviews often ask for next.",
  },
  close: {
    titleId: "security-cta",
    eyebrow: "Pilot review",
    title: "Questions before go-live?",
    description: "Pilot call covers menu, phone line, and staff logins.",
    demoNote: "Want to hear a sample call first?",
    demoHref: "/demo",
    demoLabel: "Open the demo",
  },
} as const;

export const SECURITY_CTA = {
  primary: PUBLIC_CTA_PAIR.primary,
  secondary: PUBLIC_CTA_PAIR.secondary,
  trust: { href: publicHomeHash("trust"), label: "See trust on the homepage" },
} as const;

/** Above-the-fold pillars — owner language only. */
export const SECURITY_PILLARS = [
  {
    id: "scoped-access",
    title: "Scoped access",
    body: "Your menu and orders stay in your account. Staff use their own login per location.",
  },
  {
    id: "guest-data",
    title: "Guest data",
    body: "Name and phone for pickup only—not sold or mixed across shops.",
  },
  {
    id: "human-handoff",
    title: "Human handoff",
    body: "Complaints and manager requests go to your team—no forced fake orders.",
  },
  {
    id: "signed-tools",
    title: "Signed tools",
    body: "Phone orders are verified per restaurant—random web callers cannot post tickets.",
  },
] as const;

export const SECURITY_GO_LIVE = [
  "Own logins for staff—no shared kitchen password",
  "Scan menu and test one call before forwarding the public line",
] as const;

export const SECURITY_TECHNICAL = [
  {
    title: "Scoped database access",
    body: "Row-level policies per organization; service role limited to Edge Functions.",
  },
  {
    title: "Signed voice tools",
    body: "Per-restaurant tokens for ElevenLabs tools; anon key cannot finalize orders.",
  },
] as const;

export { SECURITY_FAQ, type SecurityFaqItem } from "@/lib/landing/launch-faq";

export const SECURITY_ROADMAP = [
  "Single sign-on for multi-brand operations teams",
  "Exportable order and activity history in the dashboard",
  "Stronger limits on menu scans and sign-in attempts",
  "Documentation pack for formal security reviews",
] as const;
