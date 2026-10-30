# Index queue

Google allows roughly 10 manual "Request indexing" calls a day per property. Work top to bottom; tick when requested.
IndexNow (Bing, Yandex, Seznam, Naver) takes everything at once: `npm run seo:indexnow`.
New posts go live at 10 a day until 2026-11-17: run `npm run seo:indexnow -- --only-new` daily.

## Google: request indexing, highest value first
- [x] https://tryroal.com/ (requested 2026-10-28)
- [x] https://tryroal.com/pricing (requested 2026-10-28)
- [x] https://tryroal.com/how-it-works (requested 2026-10-28)
- [x] https://tryroal.com/facts (requested 2026-10-28)
- [x] https://tryroal.com/faq (indexed, seen 2026-10-30)
- [x] https://tryroal.com/blog (requested 2026-10-28)
- [x] https://tryroal.com/for/pizza (requested 2026-10-28)
- [x] https://tryroal.com/for/chinese (indexed, seen 2026-10-30)
- [x] https://tryroal.com/locations/jersey-city (indexed, seen 2026-10-30)
- [ ] https://tryroal.com/locations/hoboken
- [ ] https://tryroal.com/compare/answering-service
- [ ] https://tryroal.com/compare/monthly-ai-phone-plans
- [x] https://tryroal.com/tools/missed-call-calculator (indexed, seen 2026-10-30)
- [ ] https://tryroal.com/tools/call-forwarding-codes
- [ ] https://tryroal.com/blog/what-is-ai-phone-answering-restaurants
- [ ] https://tryroal.com/blog/ai-receptionist-for-restaurants
- [ ] https://tryroal.com/blog/ai-phone-answering-cost-restaurant
- [ ] https://tryroal.com/blog/how-to-forward-restaurant-calls
- [ ] https://tryroal.com/use-cases/rush-hour
- [ ] https://tryroal.com/glossary

## Done 2026-10-28
- Search Console: https://tryroal.com/ verified (HTML file + meta tag), sitemap.xml submitted, 6 URLs requested (daily cap hit on the 7th).
- IndexNow: all 257 sitemap URLs accepted (200). A Netlify scheduled function (netlify/functions/indexnow-daily.mts) pings each day's new posts.
- Brave: 14 key URLs submitted at search.brave.com/submit-url (home, pricing, how-it-works, facts, faq, blog, /for, /for/pizza, /compare, /tools, /glossary, Jersey City, Hoboken, one cornerstone post).

## Off-site (needs the founder)
1. Google Business Profile for ROAL (Jersey City service-area business) linking tryroal.com.
2. Bing Webmaster Tools: sign in and import the site from Search Console (Google verification is done). IndexNow already feeds Bing.
3. Brave: submit key URLs at https://search.brave.com/submit-url (Brave's index feeds Claude and other AI search).
4. Directories that link back: Product Hunt, G2/Capterra listing (free), AlternativeTo, SaaSHub, BetaList, Crunchbase, LinkedIn company page.
5. Local: Jersey City and Hoboken chambers of commerce, NJ restaurant association member directories.
6. Answer real owner questions on r/restaurateur and r/KitchenConfidential only where a guide answers the question.
