# Cold outreach: Jersey City + Hoboken restaurants

## Lead list

```
npm run outreach:pull     # Google Places → leads/restaurants.csv (needs GOOGLE_PLACES_API_KEY in .env.local)
npm run outreach:emails   # visits each website → leads/leads.csv with an email column
```

`leads/` is gitignored. Open `leads/leads.csv` in Google Sheets and use the `status` column
(sent 1 / sent 2 / called / walked in / replied / trial / no).

It stays inside Google's free monthly caps (Pro Text Search, Enterprise Place Details) and saves its
progress in `leads/pull-state.json` after every call. When a cap is reached it stops and writes what it has;
running it again next month picks up where it left off (rows still marked `details_pending=yes` get their
phone and website). Then re-run `outreach:emails`.

First run (2026-10-28): 1,487 places (Jersey City 1,172, Hoboken 315), 900 with details, 231 with an email.
587 left for the November run.

The pull searches a grid over both cities with several queries and splits any cell that comes back full,
so dense blocks (Newark Ave, Washington St) are not cut off.

## Sending more without looking like spam

Spam filters judge the **sender** (domain age, volume per inbox, bounce rate, replies) more than the words.
To send more, add inboxes, not volume per inbox.

1. **Separate sending domain.** Buy 1–2 look-alike domains (e.g. `tryroal.com`, `roalhost.com`, ~$10/yr each).
   Never cold email from the main domain or the personal Gmail.
2. **2–3 inboxes per domain** (Zoho Mail free tier, or Google Workspace ~$7/user). Real name, photo, signature.
3. **SPF, DKIM and DMARC** on each domain. Point the domain's website to tryroal.com.
4. **Warm up 2–3 weeks**: start at 5/day per inbox, add ~5/day each week, cap around 30–40/day per inbox.
   Six inboxes at 30/day is ~180/day, which covers both cities in under a week.
5. **Clean list**: only addresses the scraper found on the restaurant's own site; skip anything that bounces.
   Keep bounces under 2%.
6. **Write like one person to one owner**: plain text, no images, no links in email 1, under 90 words,
   one question at the end. Personalize the first line from the sheet (cuisine, review count, neighborhood).
7. **Spread sends** across the day (random 2–6 min gaps), Tue–Thu, 10am–2pm or 3–4pm.
8. **Law (CAN-SPAM)**: real postal address, honest subject, opt-out line; remove anyone who says no.

Free/cheap senders: Gmail/Zoho + a mail-merge add-on (YAMM free = 50/day), or paid tools with built-in
warm-up and rotation (Instantly, Smartlead, ~$30–40/mo) once it's working.

## Emails

**Email 1 — day 0**

> Subject: phone orders at {name}
>
> Hi {name} team,
>
> I'm Vamsi, I live in Jersey City. I built ROAL, an AI host that picks up your phone when the line is busy
> and takes the full order straight to your kitchen screen.
>
> No monthly fee — $0.90 only when an order comes through.
>
> Can I set up a free test line with your real menu so you can call it yourself? Takes 5 minutes.
>
> Vamsi
> ROAL · 207 South St, Jersey City, NJ 07307
> Not interested? Reply "no" and I won't email again.

**Email 2 — day 3** (same thread)

> Quick bump on this — happy to build the test line for {name} and send you the number. Worth a try?

**Email 3 — day 8** (same thread)

> Last note from me. Friday and Saturday nights are when most missed calls happen — if that's ever a
> problem at {name}, reply and I'll set it up. Either way, good luck this season.

**Then**: call 2–4pm, or walk in with the test line ready on your phone.

### Personal first lines (swap into email 1)

- High reviews: "Saw {name} has {reviews} reviews on Google — the phone must ring nonstop on weekends."
- Pizza / takeout: "Takeout spots like yours lose the most orders when the line's busy at 7pm."
- Hoboken: "I'm reaching out to a few places on Washington St this week."
