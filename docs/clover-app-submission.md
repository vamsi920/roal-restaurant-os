# Clover app submission pack (ROAL)

Prepared 2026-11-19. Clover pauses app approvals from **Nov 10, 2026 to Jan 3, 2027** (banner on the developer dashboard), so the goal is to have everything ready and submit as soon as review reopens.

## Where things stand

| Piece | Status |
| --- | --- |
| Developer account "ROAL" (North America) | Created |
| Sandbox app "ROAL" (App ID `RGX3R30AYK1A2`) | Created, tested end-to-end with a sandbox merchant |
| Integration code | Live on tryroal.com (custom order, line items with default tax, order total, print event) |
| Privacy policy covers Clover data | Yes: "Connected registers (Clover)" section on /privacy |
| Production developer account | **Not approved yet.** Required before any production app can be submitted. The approval form (Developer Settings → Developer Info) showed "Unable to load!" on 2026-11-19, likely the freeze |
| Production app | Not created yet (needs the approved production account) |
| Use-case video | Not recorded — script below |
| Submission | Not sent — approvals paused until Jan 3, 2027 |

## Step 0: production developer account approval (owner does this)

In the developer dashboard, switch the top-right toggle to **Production** → "Get Approved" → Developer Settings → Developer Info → **Verify Your Account**. Only the account owner can fill it in and accept the Developer Agreement. Per Clover's docs (docs.clover.com/dev/docs/submit-global-developer-account-for-approval) it asks for:

- Account type: Individual or **Business** (pick Business if ROAL has an LLC/corp)
- Business: EIN / Tax ID, company legal name, business address, tax residency country (US)
- Owner identity: name, date of birth, home address (must match a utility bill or bank statement), phone, email
- Emergency contact email (PR contact optional)
- Clover runs an OFAC check. If they email asking for documents (ID, proof of address, proof of EIN), reply within **10 business days** or the application can be rejected.

Clover doesn't state a review time. Bank details aren't listed for free apps.

## Production app settings (copy from sandbox)

- App name: **ROAL**
- Country: United States
- App type: **Private app** (shared with restaurants by direct link; can be made public later through Clover Developer Relations)
- Platform: **Web only.** Untick every Clover device tile (Flex, Mini, Station, Mobile). The sandbox app still lists devices because the multi-generation tiles would not toggle off; fix this in production before submitting.
- "Is this app an integration of an existing point of sale?": No
- Requested permissions:
  - Merchant: Read (merchant name shown in ROAL settings)
  - Orders: Read and Write (create the order, add line items, set total, print)
  - Inventory: Read (default tax rates only)
  - Nothing else: no Customers, Employees or Payments.
- REST configuration:
  - Site URL: `https://tryroal.com`
  - Alternate launch path: `/dashboard/restaurants`
  - CORS domain: blank
  - Default OAuth response: **Code**
- Webhooks: none needed.
- Pricing: Free on Clover (ROAL bills restaurants directly, per completed phone order).

After the production app is approved, set on Netlify (production context) and redeploy:

```
CLOVER_APP_ID=<production app id>
CLOVER_APP_SECRET=<production app secret>
CLOVER_ENVIRONMENT=production
```

That switch also makes the Connect Clover card visible to every restaurant owner (sandbox keys only show it to the platform admin).

## Functional description (for reviewers)

> ROAL answers a restaurant's phone with an AI host that takes pickup and delivery orders from the restaurant's own menu. When a caller confirms an order, ROAL sends it to the restaurant's Clover so staff see it with their other orders and it prints on their order printer.
>
> How it works:
> 1. The restaurant owner signs in to ROAL (tryroal.com), opens their restaurant's Settings, and clicks "Connect Clover". They approve ROAL on Clover's OAuth page (v2, expiring tokens).
> 2. For each completed phone order, ROAL creates an open order on the merchant's Clover titled "ROAL phone · PICKUP · <caller name> <phone>", with the note "Pay at pickup. Ordered by phone via ROAL." It adds one line item per unit with the menu price (including paid add-ons) and the caller's choices as the line-item note, applies the merchant's default tax rates, sets the order total, and sends a print event to the merchant's default order printer.
> 3. The customer pays at pickup on the restaurant's own Clover. ROAL never takes or stores card data.
>
> Permissions: Merchant read (merchant name), Orders read/write (create order, line items, total, print), Inventory read (default tax rates). ROAL does not read payments, customers or employees.
>
> If an order can't be sent, it still appears on ROAL's kitchen screen and the owner sees the error in ROAL settings. Owners can disconnect at any time from ROAL settings or by uninstalling the app on Clover.

## App Market listing copy

- **Tagline (short):** AI phone host that sends phone orders straight to your Clover.
- **Description:**
  > Never miss a phone order during the rush. ROAL answers your restaurant's phone with a friendly AI host that knows your menu, prices, hours and specials. It takes pickup and delivery orders, answers common questions, and hands off to staff when a caller needs a person.
  >
  > With Clover connected, every phone order lands on your Clover with your other orders, with items, add-ons, notes and sales tax, and prints on your kitchen printer. Customers pay at pickup like any other order.
  >
  > You pay only for completed phone orders. No contract, and setup takes a few minutes from your restaurant's website or menu.
- **Category:** Orders / Restaurant operations
- **Website:** https://tryroal.com
- **Support email:** vamsi@tryroal.com
- **Privacy policy:** https://tryroal.com/privacy
- **Terms / EULA:** https://tryroal.com/terms
- **Assets needed:** app icon (`public/icons/roal-512.png`), 3–5 screenshots (ROAL settings with Clover connected; kitchen screen with a phone order; the same order on the Clover dashboard with items, tax and total).

## Use-case video script (about 2 minutes, screen recording)

Record on the sandbox setup; no real customer data.

1. **Intro (10s):** tryroal.com home page. "ROAL answers a restaurant's phone and takes orders. This shows how those orders reach Clover."
2. **Connect (30s):** Sign in to ROAL → Eggmania → Settings → "Connect Clover" → Clover OAuth page → approve → back in ROAL showing "Clover connected" and the merchant name.
3. **Place an order (40s):** Agent page → "Make a test call" → order 2 Boil Fry and 1 Boiled eggs for pickup, give a name and phone number, confirm. Show the ticket on ROAL's kitchen screen.
4. **See it on Clover (30s):** Clover dashboard → Orders → the new order: title "ROAL phone · PICKUP · …", note "Pay at pickup", line items with prices, tax applied, order total.
5. **Disconnect (10s):** ROAL Settings → "Disconnect Clover".

Upload unlisted (YouTube or Loom) and paste the URL in the submission form.

## Checklist on Jan 3, 2027

1. Sign in to the Clover developer dashboard and switch to **Production** with the top-right toggle (typing the production URL directly logs you out). If the production account isn't approved yet, do Step 0 first; it can be done as soon as the form loads, before Jan 3.
2. Create the app with the settings above.
3. Fill the Market Listing (copy above, icon, screenshots) and the functional description + video URL.
4. Complete Clover's Submission Checklist and click **Submit for Approval**.
5. When approved: set production keys on Netlify, redeploy, connect a real restaurant, run `scripts/qa-clover-order.ts <restaurantId> send` against it during a quiet hour, and confirm the ticket prints.
6. Then update /facts, /faq and marketing pages to say Clover is live.
