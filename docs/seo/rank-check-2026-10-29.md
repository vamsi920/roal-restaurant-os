# SEO / AEO check — 2026-10-29 (day 2)

## Indexing
- Google: `site:tryroal.com` shows ~6 pages of results (roughly 50+ URLs) one day after launch. /pricing, /facts, /for, /faq, /tools, /try, /for/* indexed. /for/chinese indexed with Breadcrumb rich result. Home snippet still shows the old title (refresh pending recrawl, requested 10-28).
- Search Console performance: no data yet (normal 1-2 day lag; property created 10-28).
- Bing: nothing indexed yet; sitemap read OK (257, now 268 URLs), 299 URLs submitted manually over 2 days, IndexNow daily.
- Brave: nothing indexed yet; 18 key URLs submitted.
- Daily publishing works: 10 posts went live 10-29 with no deploy, sitemap 257 -> 267.

## Rankings (Google, logged-in browser, US)
| Query | Position |
|---|---|
| ROAL AI phone host restaurants (brand) | #1 (home), #2 (/for), #5 (/for/caribbean) |
| AI phone answering for restaurants | not in top 10 |
| AI receptionist for restaurants | not in top 10 |
| AI phone ordering restaurant pay per order | not in top 10 |
| restaurant missed call calculator | not in top 10 |
| call forwarding codes restaurant | not in top 10 |
| AI phone answering pizza shop | not in top 10 |
| AI phone answering jersey city restaurants | not in top 10 |
| how many calls do restaurants miss | not in top 10 |

Expected for a 1-day-old domain with no backlinks. Re-check weekly.

## AI answer engines
- ChatGPT search, "What is ROAL at tryroal.com…": accurate answer quoting $0.90/order, $0 monthly, setup steps, handoffs, no card numbers. Flagged "~2 minutes" setup (fixed: all copy now says about two minutes) and no POS proof.
- ChatGPT search, "best AI phone answering for small restaurants that charge per order": ROAL not listed. Listed per-order competitors (internal note, do not name publicly): $1.50/order flat (two vendors), 2%, 5.99%, 10% or $3/order, 2% capped at 29¢. Sources it cited were the vendors' own pages plus restaurant-tech roundups.
- Perplexity needs sign-in in the agent browser; not tested.

## Changes made today
- New /compare/per-order-pricing: flat $0.90 vs 2%/6%/10%/$1.50 at $15-$80 tickets, honest that 2% wins under $45.
- Organization schema: sameAs (PH, IH, HN, twelve.tools), alternate names, disambiguatingDescription (not Roal Ristorant Rome / Roal Food).
- Facts + llms.txt: per-order comparison fact, "also known as".
- Setup time aligned to "about two minutes" across 165 files.

## Next levers (in order)
1. Backlinks/listings that AI roundups cite: get into "AI phone answering for restaurants" roundup articles and directories (G2, Capterra, SaaSHub need sign-in).
2. Reddit/forum answers where owners ask about AI phone answering (r/restaurantowners thread ranks #3 for the brand query).
3. Once Clover connection is live (CLOVER_APP_ID set), add it to facts/FAQ; AI answers currently flag missing POS support.
4. Re-run this check on 11-05.
