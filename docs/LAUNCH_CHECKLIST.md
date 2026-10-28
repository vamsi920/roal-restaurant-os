# Launch checklist (updated 2026-10-28, evening)

The current, single list of what stands between ROAL and a real paid launch. It replaces the
stale blocker list in `LAUNCH_BLOCKERS.md`, which still describes the old Supabase stack.

Checked live on 2026-10-28 from production (`/api/health`), the Netlify env, and read-only
Stripe and Twilio API calls.

## Done in code

- Plan checkout: hosted payment page, $0.90 per completed order, billed monthly through a meter.
- Checkout requires a billing address, takes an optional business tax ID, and turns on
  automatic sales tax. The price is tax-exclusive with tax code `txcd_10103001` (SaaS, business
  use). If Stripe Tax isn't active yet, checkout still opens without tax (logged as a warning).
- Payment webhook turns plans on and off and buys a phone line for each location.
- Each completed order is reported once. An hourly scheduled job (`netlify/functions/usage-sweep.mts`
  calling `/api/billing/usage-sweep`) re-sends any report that failed. It only covers the current
  billing period and never orders from before the plan started.
- Phone host says "This call may be recorded." right after the greeting.
- With no tax rate set, the host quotes food totals as "plus tax". When a rate is set
  (Restaurant settings, Sales tax %), tickets add it.
- Terms say: per order, billed monthly, plus sales tax where it applies, and calls are announced
  as recorded.
- Billing page shows real invoices (period, orders, tax, total, status, View/Pay, PDF), a "Next bill
  so far" box (orders × $0.90, tax, total, charge date), and order lists as CSV for this month and
  for each invoice, so owners can match every charge to an order.
- Google Places key `ROAL Places (server)` is created on GCP project `roal-1ae96`, restricted to
  Places API (New), and set as `GOOGLE_PLACES_API_KEY` on Netlify. A test search worked. Project
  roal now bills to "Firebase Payment"; billing was turned off on "Prompt Fight Club" to free a slot.
- Stripe (sandbox) emails: payment and refund receipts, finalized invoices, credit notes,
  failed-payment and expiring-card emails, and the manage-subscription link are all on.

## Owner (you) must do: blocks taking real money

1. **Stripe keys are from a Sandbox** (`acct_1UVXwKGKZ05P2Y69`, dashboard shows "Sandbox"). A sandbox
   can never take real money. Live payments need the real Stripe account: activate it (business
   details, bank account), then repeat the email settings above there. Sandbox settings don't
   carry over.
2. **Switch Netlify to live keys.** `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are
   `sk_test_` / `pk_test_` today. Create a **live** webhook endpoint to `https://<domain>/api/billing/webhook`
   with the same 5 events (`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `customer.subscription.created`, `.updated`, `.deleted`) and put its `whsec_` in `STRIPE_WEBHOOK_SECRET`.
   Push a commit to rebuild. The meter, price and portal are created automatically in live mode.
3. ~~Stripe Tax~~: done in the sandbox (2026-10-28). Head office is 207 South St, Jersey City, NJ
   07307, with defaults tax-exclusive and code `txcd_10103001`, and a New Jersey sales-tax
   registration is active. A test calculation shows NJ treats business-use SaaS as exempt
   (`product_exempt`, 0%), so NJ restaurants pay no tax on ROAL. Checkout now opens with automatic
   tax `complete`. **Repeat in the live account.** Add other states only when you pass their
   thresholds or an accountant says so; until then Stripe charges no tax there.
4. ~~Stripe customer emails~~: done in the sandbox. Repeat in the live account.
5. **Upgrade Twilio from Trial.** The account is `type: Trial`, with $7.21 balance and one number. Trial
   numbers play a trial message and only accept calls from verified numbers. Upgrade, add funds, and
   turn on auto-recharge. Each line is about $1.15/month plus per-minute inbound.

## Owner must do: before announcing

6. **Domain: tryroal.com** (2026-10-28): added in Netlify as primary (www redirects), IONOS A records → 75.2.60.5,
   `NEXT_PUBLIC_APP_URL=https://tryroal.com` on Netlify and in `.env.local`, Let's Encrypt cert live, Firebase
   authorized domains include tryroal.com + www, live Stripe webhook `we_1UVYRKG9grk49qlEeF3UHT0C` now posts to
   `https://tryroal.com/api/billing/webhook` (same secret), and both phone hosts re-synced and verified on the new
   domain. The ElevenLabs post-call webhook still uses roal-os.netlify.app, which keeps working as an alias. Original steps: add it in Netlify. Set `NEXT_PUBLIC_APP_URL=https://<domain>`, add the domain to Firebase
   Auth > Authorized domains, point the live Stripe webhook at it, then re-sync phone hosts
   (`npm run resync:elevenlabs-all` with `.env.local` pointing at the new domain), because the hosts'
   tool links use the app URL. Keep `roal-os.netlify.app` working as an alias.
7. ~~`GOOGLE_PLACES_API_KEY`~~: done. Still worth doing: a budget alert on the "Firebase Payment"
   billing account, and a daily quota cap on Places API (New), so a bot can't run up the bill.
8. ~~`ELEVENLABS_WEBHOOK_SECRET`~~: done 2026-10-28. The workspace post-call webhook "ROAL post-call"
   (HMAC, transcripts) points at `/api/integrations/elevenlabs/post-call-webhook`, and its secret is on
   Netlify. When the domain changes, create a new webhook for the new URL.
9. **Voice plan capacity.** Check that the voice plan's concurrent-call limit and monthly minutes cover
   the first restaurants' rush hour. If the limit is hit, callers get no answer.
10. **One real end-to-end test on live keys.** Sign up, pay, get a line, call it from a normal phone,
    order, see the kitchen ticket, and see the order on the upcoming invoice.

## Optional

- `ELEVENLABS_AGENT_PHONE_NUMBER_ID`: lets the trial "call my phone" place a real call. Without it
  the trial runs in the browser.
- Mark the secret env vars as secret in the Netlify UI. Today they are stored as plain values and
  visible to anyone on the Netlify team. Use the UI, because marking them secret through the API
  stores nothing.
- Remove the leftover `SUPABASE_*` and `GEMINI_*` lines from `.env.local`.
- Uptime alert on `/api/health` and error alerting. Neither exists yet.
- Firestore backups (point-in-time recovery) on project `roal-1ae96`.
- Re-sync the two existing Eggmania test hosts if you want them to use the new greeting. New
  hosts get it automatically.

## Decisions for you

- **AI disclosure.** The host doesn't say it's an AI. Several US states have bot-disclosure rules
  for sales and customer-service calls. Ask a lawyer. Adding it is a one-line change.
- **Idle lines cost money.** A location with zero orders still costs about $1.15/month for its number
  and earns $0. Calls that don't end in an order also use voice minutes for free. Decide whether you
  want a small monthly minimum, or accept it as acquisition cost.
- **Legal review** of Terms and Privacy, plus a business entity that holds the Stripe account.

## Sales tax: how it works now

- **ROAL's own bill to restaurants.** Stripe Tax calculates it from the billing address at checkout
  and on each monthly invoice, once you finish item 3. Until then invoices carry no tax.
- **Food orders.** ROAL doesn't take payment for food. The restaurant charges at pickup or delivery.
  The host only quotes totals: with a tax rate set it includes it, without one it says "plus tax".
  The tax itself is the restaurant's responsibility.

## Google Places cost

ROAL makes one Text Search and one Place Details call per restaurant lookup. Because it requests
phone, website and opening hours, both calls bill at Google's higher (Pro/Enterprise) tiers:
roughly $32–35 per 1,000 searches and $17–20 per 1,000 details, after the free monthly caps
(about 1,000–5,000 of each, depending on tier). So the first ~1,000 lookups each month are free,
and after that it's about 5 cents per restaurant looked up. Confirm on Google's pricing page.

## Live Stripe (2026-10-28)

- Production `STRIPE_SECRET_KEY` is a live key on the shared account `acct_1TGuViG9grk49qlE`. That
  account's display name is "Myna-interview" and its statement descriptor is "VENKATA VAMSI DEVADULA",
  and Addy and other apps use it too. Restaurants would see those names. A separate ROAL Stripe
  account is recommended.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is still `pk_test_`, and `STRIPE_WEBHOOK_SECRET` is still the
  sandbox one. Live webhook events will fail signature checks until the live endpoint's secret is set.
- NJ sales-tax registration is active on the live account (business SaaS is exempt in NJ, 0%). Live
  head office is set to 353 Liberty Avenue, Jersey City.
