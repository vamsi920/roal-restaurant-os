# Blog And Theme Cursor Prompt Queue

Use these in a fresh Cursor agent for `/Users/vamsi/Desktop/restaurant-agent`.

Goal:
- Add a premium `/blog` section inspired by Elyra Table Talk, but in ROAL's simpler warm poster style.
- Publish strong SEO/AEO content around restaurant missed calls, AI phone ordering, live menus, kitchen tickets, and successful-order pricing.
- Then align the rest of the public/auth pages away from the old blue theme and toward the new warm/yellow/black landing style.
- Keep the homepage simple. Do not add a huge link farm.

Reference reviewed:
- `https://www.elyrasystems.com/blog`
- Their blog uses a branded journal title, category filters, editorial cards, article pages with short sections, stats, FAQs, related posts, and CTA back into the product.

Hard scope:
- Blog/public/auth/theme only: `app/blog/**`, `components/blog/**`, `lib/blog/**`, `app/landing.css`, `components/landing/**`, public pages, auth pages.
- Do not modify Supabase schema, migrations, Edge Functions, dashboard business logic, APIs, or billing logic unless a public page import breaks.
- Keep links minimal: nav can add one `Blog` link, but do not bring back many chapter links.

## 1. Blog IA Plan

Audit current public routes and write `docs/BLOG_CONTENT_PLAN.md`: blog goals, categories, 10 article titles, 6 priority full posts, SEO keywords, AEO questions, routes, components, and files to add. No code yet.

## 2. Blog Data Model

Create `lib/blog/posts.ts` with typed static blog data. Include 10 post records, categories, excerpts, read times, dates, SEO title/description, AEO questions, and CTA intent. Make at least 6 posts have full article section content.

## 3. Blog Categories

Define simple categories: Missed calls, Phone orders, Operations, Pricing, AI basics. Keep labels restaurant-owner friendly. Do not overcomplicate filtering.

## 4. Blog Index Route

Create `/blog` route with metadata. Use a warm editorial hero: “The ROAL Journal” and short subcopy about never missing calls and turning phone demand into orders.

## 5. Blog Index UI

Build premium blog cards in the new warm/yellow/black poster style: large featured card, smaller grid cards, category chips, read time, simple CTA. No dense text.

## 6. Blog Filter UI

Add client-side category filtering on `/blog` if easy. Keep it simple and accessible. If not easy, render static category chips only.

## 7. Blog Article Template

Create `/blog/[slug]` route and article template. Include category, title, summary, author/date/read time, table-of-contents anchors, article sections, FAQ, related posts, and CTA to try ROAL.

## 8. Article 1

Write full article: “Why restaurants miss calls during the dinner rush.” Cover pain, missed orders, staff overload, why voicemail fails, and how ROAL answers and sends tickets. SEO/AEO ready.

## 9. Article 2

Write full article: “How AI phone ordering helps small restaurants take more pickup orders.” Explain in simple terms: natural call, menu lookup, modifiers, confirmation, kitchen ticket.

## 10. Article 3

Write full article: “The real cost of unanswered restaurant phone calls.” Use careful illustrative math, no unsupported hard claims. End with successful-order pricing.

## 11. Article 4

Write full article: “What makes a restaurant AI voice agent sound human?” Cover natural pauses, clarification, interruptions, menu context, disclosure, and handoff.

## 12. Article 5

Write full article: “Why your phone agent must know your live menu.” Cover unavailable items, modifiers, prices, allergy handoff, and avoiding hallucinated orders.

## 13. Article 6

Write full article: “Paying only for successful orders: why it matters.” Explain simple ROI, aligned incentives, what counts as a successful order, and why restaurants prefer it.

## 14. Article Summaries 7-10

Write strong summaries for 4 more posts: setup in 20 minutes, rush-hour staffing, phone orders vs delivery apps, and AI handoff. If time allows, include full sections; otherwise keep them as polished cards but not broken links.

## 15. Blog SEO Metadata

Add metadata for `/blog` and each article: title, description, open graph, canonical path, robots-friendly copy. Keep keyword use natural.

## 16. Blog AEO Blocks

For every full article, add an “Answer in short” box and 3-5 FAQ questions with concise answers. Use article-specific questions people may ask Google/ChatGPT.

## 17. Blog Structured Data

Add JSON-LD for BlogPosting and FAQPage on article pages. Keep it valid, static, and derived from `lib/blog/posts.ts`.

## 18. Blog CTA Path

Add article CTA blocks that lead to `/demo` or the homepage CTA, not too many links. Copy should say “Try ROAL on your menu” or “Hear a demo call.”

## 19. Blog Visual Polish

Add lightweight visual motifs: ticket corners, phone rings, accent scribbles, small line-art panels. Use CSS/SVG only, no stock images.

## 20. Blog QA

Run lint/build if possible. Check `/blog` and at least one article visually on mobile/desktop. Fix broken links, unreadable copy, overflow, metadata/type errors.

## 21. Public Theme Audit

Audit all public/auth pages for old blue theme or mismatched styling: `/`, `/blog`, `/demo`, `/pricing`, `/security`, `/contact`, `/login`, `/signup`. Write findings in `docs/PUBLIC_THEME_AUDIT.md`.

## 22. Shared Public Theme Tokens

Extend `app/landing.css` with shared warm public-page tokens: cream background, ink text, yellow/lime/orange accent, poster cards, simple outlines, focus states. Keep dashboard untouched.

## 23. Nav Theme Alignment

Update public nav to include only core links: Home, Blog, Demo, Login, CTA. Make it visually match the landing. Avoid blue and avoid link clutter.

## 24. Footer Theme Alignment

Keep footer compact and warm themed. Add Blog only if useful. No multi-column footer link farm.

## 25. Demo Page Theme

Align `/demo` with the new style: warm background, chunky panels, simple transcript, minimal text, clear demo CTA. Do not expand the page.

## 26. Pricing Page Theme

Align `/pricing` with warm theme and simple copy. Highlight “only pay for successful orders” without adding complex plans or unsupported exact prices.

## 27. Security Page Theme

Align `/security` visually, but keep it calm and trustworthy. Use plain-language blocks for data, human control, and audit trail. Avoid technical walls of text above the fold.

## 28. Contact Page Theme

Align `/contact` with the new style. Keep form simple and warm. Copy: “Show us your menu; we’ll show you the missed-call path.”

## 29. Login Page Theme

Align `/login` with warm public theme. Ensure Supabase/auth form behavior stays unchanged. Do not modify auth logic unless styling requires class names.

## 30. Signup Page Theme

Align `/signup` with warm public theme. Keep validation and redirect behavior unchanged.

## 31. Auth Layout QA

Check auth layout on mobile/desktop. Fix overflow, focus rings, contrast, form spacing, button styles. Auth must remain functional.

## 32. Homepage Background Motion

Add subtle animated background energy to the homepage: CSS line-art phone waves, ticket path, soft moving accent dots, or grid shimmer. No raster background image. Respect reduced motion.

## 33. Blog Background Motion

Add lighter matching background details to `/blog`: journal paper texture, small ticket stamps, slow accent drift. Keep reading comfortable.

## 34. Remove Blue Remnants

Search public/auth landing styles for blue/slate theme classes or gradients. Replace public-page blue accents with warm theme equivalents. Do not touch dashboard blue styles.

## 35. Public Page Copy Cleanup

Make all public page copy plain and nontechnical. Remove jargon from public pages. Technical detail can stay only if it is on `/security` and explained simply.

## 36. Link And Route QA

Check all public links: nav, footer, blog cards, article related posts, CTAs. Ensure no dead links and no unexpected dashboard route unless Login/Signup.

## 37. Auth Smoke Prompt

Verify auth pages render and forms can be filled. Do not submit real credentials. Confirm login/signup UI still points to existing auth handlers.

## 38. Mobile Visual QA

Inspect `/`, `/blog`, one blog article, `/demo`, `/login`, `/signup` at mobile width. Fix text overlap, cramped cards, horizontal overflow, and tiny CTAs.

## 39. Build And Lint

Run `npm run lint` and `npm run build`. Fix public/theme/blog issues only. Do not chase unrelated backend or Supabase issues.

## 40. Final Summary

Summarize blog posts created, routes added, theme pages updated, background animation added, links kept, and any remaining gaps. Confirm auth styling changed without auth logic changes.
