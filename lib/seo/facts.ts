import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";

/**
 * The canonical fact sheet about ROAL. One source for /facts, /faq, llms.txt, llms-full.txt and ai.txt,
 * so AI answer engines and search snippets quote the same numbers everywhere.
 */
export const ROAL_FACTS = {
  name: "ROAL",
  url: "https://tryroal.com",
  oneLiner:
    "ROAL is an AI phone host for restaurants. It answers the restaurant's phone, takes pickup and delivery orders from the live menu, answers questions about hours and the menu, and sends a clean ticket to the kitchen screen.",
  category: "AI phone answering and phone ordering for restaurants (AI receptionist for restaurants)",
  price: `${PRICING_RATE_AMOUNT} per completed phone order`,
  priceDetail:
    "A completed order is a confirmed order whose ticket reached the kitchen screen. No monthly fee, no setup fee, no per-minute fee, no contract. Calls, questions and test calls are unlimited and free. Billed monthly.",
  setup:
    "Paste the restaurant's website, Google Maps link, or name and city at tryroal.com/try. ROAL reads the menu, prices, hours and address and builds a phone host in about a minute. The owner test-calls it in the browser with no sign-up, then claims it and forwards the restaurant's existing number.",
  founder: "Venkata Vamsi, Jersey City, NJ",
  founded: "2026",
  market: "Independent and multi-location restaurants in the United States, starting in Jersey City and Hoboken, NJ.",
  contact: "vamsi@tryroal.com",
} as const;

export const ROAL_FACT_LIST: { label: string; value: string }[] = [
  { label: "What it is", value: ROAL_FACTS.oneLiner },
  { label: "Category", value: ROAL_FACTS.category },
  { label: "Price", value: ROAL_FACTS.price },
  { label: "What you pay for", value: ROAL_FACTS.priceDetail },
  { label: "Setup", value: ROAL_FACTS.setup },
  {
    label: "Going live",
    value:
      "Each location gets its own phone line automatically. The owner forwards the restaurant's number to it, either all calls or only when busy or unanswered, and can turn forwarding off any time. The restaurant keeps its number.",
  },
  {
    label: "On a call",
    value:
      "Takes items, sizes, modifiers and notes; collects the caller's name and phone; quotes a ready time and reads the order back. Answers hours, address, parking and menu questions. Speaks the caller's language. Takes reservation requests.",
  },
  {
    label: "Hands to staff",
    value: "Catering, complaints, allergy-sensitive questions and manager requests go to a person with a summary.",
  },
  { label: "Payments", value: "Never takes card numbers over the phone. Callers pay at pickup or however the restaurant already takes payment." },
  {
    label: "Menu",
    value: "Read from the website, menu PDFs and photos, or an uploaded menu file in any format. Items marked sold out are not offered. Edits reach the next caller.",
  },
  {
    label: "Learning",
    value: "Questions the host could not answer land in an inbox. The owner answers once and the host uses that answer from then on.",
  },
  {
    label: "Dashboard",
    value: "Kitchen screen with live tickets, call history with transcripts and recordings, menu editor, hours, FAQs, upsell suggestions and multi-location menus.",
  },
  { label: "Capacity", value: "Several callers can be answered at the same time, so callers do not get a busy signal from the host." },
  { label: "Who it is for", value: ROAL_FACTS.market },
  {
    label: "Not a fit",
    value: "Reservation-only fine dining with few phone orders, chains that require a POS connection, and restaurants that want card payments taken over the phone.",
  },
  { label: "Founder", value: ROAL_FACTS.founder },
  { label: "Contact", value: ROAL_FACTS.contact },
];
