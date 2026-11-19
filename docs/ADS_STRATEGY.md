# Paid ads: brand awareness with US restaurant owners

Goal: make "ROAL" a name US restaurant owners and managers recognise. Not clicks.
Budget: $200/month on Meta (Facebook + Instagram), Reach objective.

## Meta setup (created 2026-11-19)

| Thing | Value |
|-------|-------|
| Business portfolio | ADS (186124622404175) |
| Facebook Page | ROAL (facebook.com/profile.php?id=61596861564764) |
| Ad account | ROAL USD (896838160185563), USD, America/New_York |
| Pixel / dataset | ROAL website (1734380364975786), owned by the portfolio |
| Netlify env | `NEXT_PUBLIC_META_PIXEL_ID=1734380364975786` |

The older pixel 2024582928216198 sits on the personal INR ad account (1400488130216836) and is unused.
Automatic advanced matching is off (no visitor emails/phones sent to Meta).

Pixel events: `PageView` on public pages (never `/dashboard`, `/admin`, `/api`), `StartTrial` when a
trial host finishes building on /try, `CompleteRegistration` on account sign-up.

## Campaign: "ROAL Awareness - US restaurant owners"

- Objective: Awareness, performance goal "Maximise reach", frequency target 2 per 7 days.
- Ad set "US owners - trade interests": lifetime $200, 30 days.
- Location: United States. Advantage+ audience off; "Use as a suggestion" off (strict).
- Detailed targeting (any of):
  - Behaviour: Food and restaurant Page admins
  - Job titles: Restaurant Owner, Restaurateur, Restaurant General Manager, Restaurant management,
    Food and Beverage Manager
- Estimated audience: 355K–418K.
- Multi-advertiser ads off (no competitor ads next to ours).

## Creative

`marketing/ads/roal-ad-1.png` … `-3.png` (1080×1350), source in `marketing/ads/source.html`.

1. "Every missed call is a missed order." (counter photo, missed-call badge)
2. "ROAL answers your restaurant's phone." (night pizzeria, phone-order ticket)
3. "$0.90 per phone order. No monthly fee." (cream, big orange price)

Primary text: "Busy line during the rush? ROAL is an AI phone host that answers every call, takes
the pickup order from your menu and sends it to your kitchen. $0.90 per completed order. No monthly fee."
Headline: "The AI phone host for restaurants". Link: `https://tryroal.com/?utm_source=meta&utm_medium=paid_social&utm_campaign=awareness_us_owners`.

Swap one image every 3–4 weeks.

## How to judge it (after 4 weeks, not before)

- Search Console impressions for "roal" / "tryroal" (branded search). The main signal.
- Meta: reach, frequency, CPM.
- Pixel `StartTrial` count, direct visits.
- Cold-email reply rate before vs during ads (`npm run outreach:stats`).

## Next steps

- After ~2 weeks of pixel data: add a retargeting ad set (site visitors, 180 days), ~$1.50/day.
- At ~100 trials: 1% lookalike of `StartTrial`.
- Month 2 test: Reddit ads on r/restaurantowners.
