# Product Marketing Context

**Document version:** v1
**Last updated:** 2026-10-28

## Product Overview
**One-liner:** ROAL is an AI phone host for restaurants. It answers the phone, takes pickup orders from your real menu, and sends the ticket to your kitchen screen. You pay $0.90 only when an order comes through.

**What it does:** An owner pastes their website or Google Maps link. ROAL reads the menu, prices, hours and address, and builds a phone host they can test-call in the browser within about a minute. Once claimed, the host gets its own phone line. It takes orders (items, modifiers, name, phone, ready time), answers hours, menu and allergen questions, hands catering, complaints and manager requests to staff, and learns from questions it couldn't answer.

**Product category:** AI phone answering / AI phone ordering for restaurants ("AI receptionist for restaurants", "AI phone host").

**Product type:** Self-serve vertical SaaS with usage-based billing.

**Business model:** $0.90 per completed phone order: a confirmed order whose ticket reaches the kitchen. No monthly fee, setup fee, per-minute fee or contract. Calls, questions and test calls are unlimited. Billed monthly through Stripe metered billing.

## Target Audience
**Target companies:** Independent takeout-heavy restaurants and small multi-location groups (pizza, Indian, Chinese, delis, breakfast spots). The first market is Jersey City and Hoboken, NJ.

**Decision-makers:** The owner or owner-operator. Often new to tech, works the floor or the kitchen, decides fast, and dislikes long setup or contracts.

**Primary use case:** Answering phone orders during rush hour, when staff can't pick up.

**Jobs to be done:**
- "Pick up the phone when we're slammed so I don't lose the order."
- "Get phone orders onto the kitchen screen correctly, without someone scribbling notes."
- "Stop pulling staff off the floor to answer 'what time do you close?'"

**Use cases:**
- Friday and Saturday dinner rush, when the line is busy.
- Questions about hours, parking and allergens.
- After-hours or short-staffed shifts.
- Catering inquiries routed to a person with a summary.
- Callers who prefer another language.

## Personas
B2C-like buying: the owner is user, champion and payer at once.

| Persona | Cares about | Challenge | Value we promise |
|---|---|---|---|
| Owner-operator | Not losing orders, not adding monthly bills | Phone rings while they're on the line or at the counter | Every forwarded call gets picked up; pay only when it makes you money |
| Manager / front of house | Fewer interruptions, correct tickets | Juggling the phone and guests at the counter | Clean tickets on the kitchen screen; tricky calls handed over with a summary |

## Problems & Pain Points
**Core problem:** The phone rings most exactly when nobody can answer it. A missed call is an order that goes to the place down the street.

**Why alternatives fall short:**
- Staff answering: pulls people off the floor, and guests at the counter wait.
- Voicemail: hungry callers don't leave a voicemail and wait.
- Other AI phone tools: they charge a monthly fee of about $79–$599 per location whether or not orders come in, need sales calls or setup, and often need POS integration.
- Third-party delivery apps: 15–30% commission and they own the customer.

**What it costs them:** The lost order value on every missed rush-hour call, plus staff time pulled away from guests. The funnel asks for the owner's own numbers: calls missed on a busy Friday and the typical order size.

**Emotional tension:** Hearing the phone ring out during the rush, and the guilt or stress of choosing between the guest in front of you and the caller.

## Competitive Landscape
Internal only: never name these companies in public copy.

**Direct:** Loman, Slang.ai, PolyAI, heytruffle, Goodcall, Maple, Kea. They charge self-reported prices of about $79–$599 per location per month. They fall short because of fixed monthly fees, sales-led onboarding and long setup.

**Per-order competitors (found 2026-10-29 via ChatGPT search):** several now charge per order with $0/month: two at $1.50 per completed order, one at 2% per order, one at 5.99% of subtotal, one at $3/order or 10%, one at 2% capped at 29¢. ROAL's flat $0.90 is cheapest for tickets above ~$45; a 2% fee wins on small tickets. Do not say "most competitors charge monthly" without qualification.

**Secondary:** Answering services and call centers. They are expensive per minute, don't know the menu and don't write kitchen tickets.

**Indirect:** Hiring another person for the phone, voicemail, or pushing everyone to online ordering and delivery apps. These carry high fixed cost or commission, and callers who want to call still call.

## Differentiation
**Key differentiators:**
- Pay per completed order ($0.90), with no monthly fee.
- Builds itself from your link in about a minute. You test-call it in the browser before signing up.
- Reads the real menu from your website, menu PDFs and photos, or an upload in any format.
- Gets its own phone line automatically; you just forward your number.
- Sends orders straight to the kitchen screen.
- Learns: unanswered questions land in an inbox, and you answer them once.

**How we do it differently:** Self-serve and success-priced. The owner hears their own host taking an order before talking to anyone.

**Why that's better:** No risk. If it doesn't bring in orders, it costs nothing.

**Why customers choose us:** Trying it takes a minute, and the price only kicks in when it makes them money. (To be confirmed with real customers.)

## Objections
| Objection | Response |
|---|---|
| "Callers will hate talking to a robot." | Try a call yourself first. It's a natural voice, and you pick the voice and the name. Tricky calls go to a person. |
| "It'll get orders wrong." | It reads from your live menu and confirms items, modifiers, name and phone. Sold-out items aren't offered. |
| "Another monthly bill." | There is no monthly fee. You pay $0.90 only when an order reaches your kitchen. |
| "Setup sounds complicated." | Paste a link. Going live means forwarding your number, which takes a few minutes with most carriers. |

**Anti-persona:** Fine dining or reservation-only restaurants with few phone orders. Chains that require POS integration (out of scope by design). Restaurants wanting phone card capture (not supported).

## Switching Dynamics
**Push:** Missed calls during rush hour, staff stretched thin, and paying monthly for tools that don't pay off.

**Pull:** Hearing your own host take an order in a minute, no monthly fee, and tickets on the kitchen screen.

**Habit:** "We've always just picked up the phone." Their number is printed everywhere, and they're comfortable with their current setup.

**Anxiety:** Callers being annoyed, wrong orders, losing control of the phone line, and hidden costs.

## Customer Language
**How they describe the problem:** Mostly inferred so far; replace with real owner quotes.
- "The phone doesn't stop ringing on Friday nights."
- "We can't pick up when it's busy."

**How they describe us:** Not captured yet; there are no customers so far.

**Words to use:** phone host, pick up, pickup order, kitchen screen, ticket, rush, busy, forward your number, completed order, your menu.

**Words to avoid:**
- In owner-facing copy, never use agent, LLM, ElevenLabs, provision, sync, webhook, env, integration or platform.
- Avoid absolute claims, such as "never miss a call", "every ring", "first ring", "perfect accuracy" or "guaranteed savings".

**Glossary:**
| Term | Meaning |
|---|---|
| Host | The AI that answers the restaurant's phone |
| Completed order | A confirmed order whose ticket reached the kitchen screen. This is the billable event. |
| Test call | An in-browser call with your own host before going live |
| Line | The dedicated phone number ROAL gives each location; the owner forwards their number to it |
| Claim | Turning the free demo host into your restaurant's account |

## Brand Voice
| Attribute | Means | Doesn't mean | Example line |
|---|---|---|---|
| Plain | Words an owner uses on a busy night | Dumbed down or cute | "Your phone, answered." |
| Honest | Hedge where outcomes depend on setup, and use no invented numbers | Timid | "Answer more pickup calls during rush." |
| Concrete | Show the ticket, the order, the price | Abstract AI promises | "2× Margherita · Pickup · 7:15 pm" |
| Neighborly | One owner-minded person talking to another | Corporate | "I'm Vamsi, I live in Jersey City." |

**Tone by context:**
- **Support:** Calm, with short steps and no jargon.
- **Launch:** Show the demo and use the price as the hook.
- **Errors:** Say what happened and offer one next step ("Try the Google Maps link or the name and city instead").
- **Sales:** Under 90 words with one question, and offer to build a free test line.
- **Social:** Founder-led, with real rush-hour moments.

**Terms we own:** "phone host"; "pay only for completed orders".

**Never use (and why):** "ElevenLabs" and other vendor names, because they're internal. Competitor names, because the competitor list is internal. "Never miss a call", because it can't be proven.

## Proof Points
**Metrics:** None from customers yet. Product facts that can be cited:
- the host is built in about a minute;
- $0.90 per completed order;
- unlimited calls.

**Customers:** None yet (pre-launch, outreach started 2026-10-28).

**Testimonials:** None yet.

**Value themes:**
| Theme | Proof |
|---|---|
| Zero risk | No monthly fee; you pay only for completed orders |
| Instant | Paste a link, then test-call your own host in about a minute |
| Knows your menu | Reads the website, PDFs and photos, or any uploaded menu file |

## Goals
**Business goal:** Sign the first paying restaurants in Jersey City and Hoboken.

**Conversion action:** Paste a link on /try, test-call the host, leave name, phone and email, then claim and forward the number.

**Current metrics:** First outreach list pulled: 1,487 places, 231 with emails. No funnel or revenue metrics yet.

## Learnings
*Decisions and tested lessons. Newest first. Keep it to about 20 active entries.*
| Date | Learning | Evidence | Applies to | Status |
|---|---|---|---|---|
| 2026-10-27 | Keep pricing to one number ($0.90/completed order); owner-facing math like "$4k lost / $78" confused people | Founder review of funnel pricing screen | funnel, pricing, ads, emails | active |
| 2026-10-27 | Owner-facing UI and copy must have zero developer jargon or vendor names | Founder feedback on dashboard | all copy | active |

## Changelog
*Newest first. One line per revision: what changed and why.*
- v1 (2026-10-28) — Initial context, auto-drafted from landing, FAQ, funnel, competitor notes and outreach docs.
