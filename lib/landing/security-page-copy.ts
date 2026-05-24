/** Plain-language security copy for `/security`. */

import { publicHomeHash } from "@/lib/landing/public-links";
import { PUBLIC_CTA_PAIR } from "@/lib/landing/public-cta";

export const SECURITY_PAGE_COPY = {
  hero: {
    eyebrow: "Security",
    title: "Guest info stays yours. Your team stays in charge.",
    description:
      "ROAL collects names and phone numbers to run pickup orders—not to build a marketing list. Each restaurant’s menu and tickets stay in that account, and your staff can still step in anytime.",
  },
  pillars: {
    titleId: "security-pillars-heading",
    eyebrow: "How we protect you",
    title: "Five things owners ask about",
    description:
      "Who can see your data, what we store about guests, how orders are tracked, when staff take over, and how phone orders are verified.",
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
    description:
      "Short answers on guest data, access, handoffs, and phone-order safety. Technical depth is in the section above.",
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
    description:
      "On a pilot call we review your menu, phone setup, and staff logins together—so the first real guest call feels routine.",
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
    body: "Your menu, orders, and settings belong to your restaurant account—not a shared folder. Staff sign in with their own login; they only see locations they are invited to.",
  },
  {
    id: "guest-data",
    title: "Guest data",
    body: "We ask for the name and phone number needed to run the pickup—nothing extra for ads or resale. That info stays tied to your tickets, not mixed with other shops.",
  },
  {
    id: "audit-trail",
    title: "Audit trail",
    body: "Draft carts, status changes, and completed pickups are logged so you can replay a busy night: what was ordered, when it finalized, and what changed on the ticket.",
  },
  {
    id: "human-handoff",
    title: "Human handoff",
    body: "Catering, complaints, and “I need a manager” go to your team. ROAL does not make up guest details to force an order through—you still run the pass.",
  },
  {
    id: "signed-tools",
    title: "Signed tools",
    body: "When ROAL reads your menu or updates a cart, each request is tied to your restaurant with a key you can rotate. Random internet callers cannot trigger those actions with a guessed link.",
  },
] as const;

export const SECURITY_GO_LIVE = [
  "Give each staff member their own login—no shared password on the kitchen tablet",
  "Scan your menu and run one test call before you forward the public line",
  "If someone with dashboard access leaves, ask us to refresh phone-order access for your shop",
  "Train on a separate test restaurant—do not practice on real guest names and numbers",
] as const;

export const SECURITY_TECHNICAL = [
  {
    title: "Organization-scoped RLS",
    body: "Supabase Auth plus row-level policies on menus, orders, and settings. Dashboard users need a profile and membership row; service role is limited to Edge Functions.",
  },
  {
    title: "roal1 signed voice tools",
    body: "ElevenLabs tools call Edge Functions with a per-restaurant bearer token (roal1) or legacy AGENT_TOOL_SECRET during migration. The anon key alone cannot finalize orders.",
  },
  {
    title: "Guest identity on finalize",
    body: "finalize_order rejects orders without customer_name and customer_phone collected on the call—no placeholder identity in production paths.",
  },
  {
    title: "Secrets and audit storage",
    body: "Signing keys and database credentials live in server configuration—not in the browser or the script guests hear. Menu scans, tool calls, and sensitive dashboard actions write to usage and audit tables.",
  },
] as const;

export { SECURITY_FAQ, type SecurityFaqItem } from "@/lib/landing/launch-faq";

export const SECURITY_ROADMAP = [
  "Single sign-on for multi-brand operations teams",
  "Exportable order and activity history in the dashboard",
  "Stronger limits on menu scans and sign-in attempts",
  "Documentation pack for formal security reviews",
] as const;
