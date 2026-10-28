import { PRICING_NO_ORDER_LINE, PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-static";

/** Plain-language facts for AI assistants and crawlers (llms.txt convention). */
export function GET() {
  const origin = getSiteOrigin() ?? "https://roal-os.netlify.app";
  const body = `# ROAL

> ROAL is an AI phone host for restaurants. It answers the restaurant's phone, takes pickup and delivery orders from the live menu, answers questions about hours and the menu, and sends a clean ticket to the kitchen screen.

## Pricing
- ${PRICING_RATE_AMOUNT} per completed phone order.
- ${PRICING_NO_ORDER_LINE}
- No monthly fee, no per-minute fees, no setup fee, no contract.

## How it works
1. Paste the restaurant's website, Google Maps link, or "Name, City" at ${origin}/try.
2. ROAL reads public pages and builds the phone host with the menu, hours, and address.
3. The owner test-calls the host in the browser, no sign-up needed.
4. The owner claims the host, then forwards the restaurant's phone number to it.

## What the host does on a call
- Takes pickup and delivery orders, including item changes and notes.
- Answers questions from the live menu and approved FAQs.
- Speaks the caller's language.
- Takes reservation requests and passes complaints, catering and manager requests to staff.
- Never takes card numbers over the phone.

## For restaurant staff
- Kitchen display with live tickets (new, preparing, ready).
- Calls and orders with transcripts and recordings.
- Menu editor, hours, FAQs, upsell rules, and multi-location menus.
- An inbox of questions the host could not answer, one click to add an answer.

## Links
- Home: ${origin}/
- Try it: ${origin}/try
- Pricing: ${origin}/pricing
- Security: ${origin}/security
- Blog: ${origin}/blog
- Contact: venva920@gmail.com
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
