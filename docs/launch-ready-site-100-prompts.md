# Launch-Ready Public Site Cursor Prompt Queue

Use these in a fresh Cursor agent for `/Users/vamsi/Desktop/restaurant-agent`.

Goal: make the public site launch-ready while preserving the current homepage theme. Do **not** replace the new ethereal glass/lavender/black homepage. Improve it and extend the same professional theme across public pages, auth pages, blog, pricing, about, demo, FAQ, SEO/AEO, and visual QA.

Current theme to preserve:
- Homepage uses `LandingHomeShell`, `app/landing-home.css`, `components/landing/home/**`, and `/landing/hero-bg.mp4`.
- Visual direction: soft glass, light purple/violet/pink/amber wash, black pill CTAs, minimal premium SaaS feel.
- Do not bring back the old yellow/cream poster theme on public pages.
- Do not add center orb circles back.

Competitor lessons:
- Talk2Order: nav includes Features/Pricing/FAQ/About/Blog + Book a Demo; shows live product stats and FAQ.
- BuzzOrder: clear “never miss a phone order,” 3-step how-it-works, pricing tiers, included features, FAQs.
- TastyVox: demo-first CTA, trust benefits, “answers like your best front-of-house,” blog/free tools.
- Serviio/TalkDin: simple setup flow, book demo, pricing, FAQ, dashboard/order visuals.

Hard scope:
- Public frontend and auth styling only: `app/page.tsx`, `app/about/**`, `app/blog/**`, `app/demo/**`, `app/pricing/**`, `app/contact/**`, `app/security/**`, `app/(auth)/**`, `components/landing/**`, `components/blog/**`, `components/auth/**`, `lib/landing/**`, `lib/blog/**`, public CSS.
- Do not modify dashboard business logic, Supabase schema, migrations, Edge Functions, restaurant APIs, billing logic, or auth logic.
- Auth pages must keep existing form behavior.
- Use `hello@getroal.com` for mailto demo/contact CTAs unless a newer configured contact email already exists.
- Pricing headline must highlight: **Only pay for successful orders** and **$0.90 per successful order**.

## 1. Launch Readiness Plan

Audit public routes and write `docs/PUBLIC_LAUNCH_PLAN.md`: required pages, current gaps, theme tokens to reuse, nav structure, SEO/AEO needs, QA checklist. No code yet.

## 2. Preserve Theme Guardrails

Add a short note in `docs/PUBLIC_LAUNCH_PLAN.md` saying not to replace `LandingHomeShell`, `landing-home.css`, hero video, or the lavender/black glass theme. Do not code yet.

## 3. Public Route Map

Document desired routes: `/`, `/pricing`, `/blog`, `/blog/[slug]`, `/about`, `/demo`, `/contact`, `/login`, `/signup`, `/security`. Note missing routes.

## 4. Shared Home Theme Tokens

Extract reusable public theme tokens from `app/landing-home.css` into safe shared classes or CSS variables for public/auth pages. Keep dashboard untouched.

## 5. Marketing Shell Theme

Update `MarketingShell`/public shell to visually match the homepage: glass surfaces, lavender/pink/amber wash, black CTAs. Do not affect homepage shell internals.

## 6. Nav IA Update

Update nav links to: Product or How it works, Pricing, Blog, About, Book a demo, Login. Keep it minimal and responsive.

## 7. Nav Visual Polish

Style nav as premium glass pill/chrome matching homepage. Use active states, mobile drawer, focus states, and no link clutter.

## 8. Floating Pricing Pill

Add a small floating/top hero badge: “Only pay for successful orders · $0.90/order”. Make it elegant, not spammy, and link to `/pricing`.

## 9. Footer IA

Create a compact launch-ready footer: Product, Company, Resources, Login, Book demo, email. Keep it professional but not a huge link farm.

## 10. Footer Visual Theme

Style footer with the current glass/lavender/black theme. Include copyright and short trust line.

## 11. Homepage Section Audit

Audit current homepage sections. Identify where to add metrics, FAQ, and enterprise polish without changing the theme or making it long.

## 12. Homepage Hero Copy Polish

Polish hero copy to be sharper: “Never miss a restaurant call again.” Keep lead short and nontechnical. Preserve layout.

## 13. Homepage CTA Polish

Make primary CTA “Hear a demo call” and secondary “Book a demo” or “See how it works”. Use black/glass button styles.

## 14. Homepage Metrics Strip

Add a trust metrics strip with clearly labeled example/pilot metrics: hours saved, orders recovered, phone interruptions reduced. Avoid fake claims; label as “pilot metrics we track” if not real.

## 15. Homepage Money Saved Card

Add an illustrative savings card that shows missed-call recovery math. Keep conservative and labeled “example”. Do not claim guaranteed savings.

## 16. Homepage Enterprise Trust Row

Add trust points: secure menu data, human handoff, live kitchen ticket, no per-minute surprise billing. Keep copy short.

## 17. Homepage How Flow Plan

Plan a cinematic scroll flow for How it works: scan menu → connect line → AI answers → ticket lands. No code yet.

## 18. Homepage How Flow Build

Replace the three static how-it-works cards with a simple scroll flow. Use sticky visual or step timeline that works on mobile.

## 19. Homepage How Flow Motion

Add subtle reveal/ticket movement on scroll. Use transform/opacity only and respect reduced motion.

## 20. Homepage Product Proof Visual

Add a compact visual showing a call becoming a kitchen ticket. Reuse existing product/KDS preview data if safe.

## 21. Homepage Pricing Teaser

Enhance pricing teaser with “Only pay for successful orders” and “$0.90/order”. Link to `/pricing`. Keep copy punchy.

## 22. Homepage FAQ Section

Add FAQ near the bottom for SEO/AEO: pricing, setup, phone number, menu accuracy, human handoff, AI disclosure, auth/security.

## 23. Homepage FAQ Schema

Add JSON-LD FAQPage for homepage FAQ if easy. Keep it valid and static.

## 24. Homepage Final CTA

Final section: “Your next missed call can be an order.” Buttons: “Hear a demo call” and “Book a demo”. Book demo should mailto `hello@getroal.com`.

## 25. Homepage Mobile QA

Inspect homepage mobile width. Fix nav, hero text, metrics, how flow, FAQ, and footer overflow.

## 26. Pricing Page Plan

Audit current `/pricing`. Plan a professional SaaS pricing page around success-based pricing and $0.90 per successful order.

## 27. Pricing Hero

Rewrite pricing hero: “Only pay when ROAL sends an order to your kitchen.” Include $0.90 per successful order clearly.

## 28. Pricing Card

Build a beautiful primary pricing card: $0.90 per successful order, pilot/onboarding note, no charge for hangups/wrong numbers/small talk.

## 29. Pricing Included Section

Add what is included: AI phone ordering, live menu, modifier handling, kitchen ticket, demo call, basic reporting, human handoff.

## 30. Pricing Comparison

Add comparison: ROAL vs missed calls vs phone-only staff vs delivery-app commissions. Keep claims qualitative or illustrative.

## 31. Pricing FAQ

Add pricing FAQ: what counts as successful order, setup cost, volume, refunds, cancellations, no per-minute surprise.

## 32. Pricing CTA

Add strong CTA: “Start with a demo order” and “Book pricing walkthrough”. Mailto for walkthrough.

## 33. Pricing SEO/AEO

Update pricing metadata and add answer-style sections for “How much does restaurant AI phone ordering cost?”

## 34. Blog Theme Audit

Audit blog index/articles for old yellow/cream theme. Plan exact changes to match lavender/black glass theme.

## 35. Blog Theme Update

Restyle `/blog` index to match homepage: glass cards, lavender accents, black CTAs, subtle video-gradient feel. Keep readability high.

## 36. Blog Article Theme

Restyle article pages with same public theme. Keep long reading comfortable: white/glass article body, strong headings, no noisy background under text.

## 37. Blog Content Audit

Audit existing blog posts for SEO/AEO quality and outdated copy. Identify top 6 posts to improve.

## 38. Blog Rewrite 1

Improve the missed calls blog with clearer pain points, answer summary, FAQ, CTA to demo, and internal links.

## 39. Blog Rewrite 2

Improve the AI phone ordering blog with simple language, restaurant examples, FAQ, CTA, and natural SEO terms.

## 40. Blog Rewrite 3

Improve the cost of unanswered calls blog with careful illustrative math and no fake guarantees.

## 41. Blog Rewrite 4

Improve the human-sounding voice agent blog: natural language, disclosure, handoff, menu context.

## 42. Blog Rewrite 5

Improve the live menu blog: modifiers, unavailable items, price accuracy, kitchen confidence.

## 43. Blog Rewrite 6

Improve the successful-order pricing blog: $0.90/order, aligned incentives, no per-minute surprises.

## 44. Blog Related Posts

Ensure article pages show related posts and a tasteful CTA. No dead links.

## 45. Blog SEO Metadata

Check metadata, canonical, OG, article dates, slugs, and sitemap coverage for blog posts.

## 46. About Page Plan

Create `/about` plan: company mission, why restaurants miss calls, why ROAL exists, values, product promise, CTA. No fake team photos.

## 47. About Page Build

Create `/about` page in current theme. Keep it professional and concise.

## 48. About Founder/Company Section

Add company story section without inventing personal details. Use “built for independent restaurants” and product principles.

## 49. About Values

Add 3 values: answer every guest, keep staff in control, charge only for successful orders.

## 50. About CTA

Add CTA to book a demo and hear a demo call. Mailto for book demo.

## 51. Demo Page Plan

Audit `/demo`. Plan one-page demo with video placeholder and bottom email/sign-up CTA.

## 52. Demo Video Placeholder

Add a polished empty video space on `/demo` for future recording. Label it “Demo video coming here” or “Your recording goes here”.

## 53. Demo Flow

Make `/demo` one-page: video placeholder, 3-step call flow, sample transcript, sample kitchen ticket, CTA.

## 54. Demo Mail CTA

At bottom of `/demo`, add “Book a demo call” mailto `hello@getroal.com` and “Sign up” button immediately after it.

## 55. Demo Theme

Restyle `/demo` to match homepage glass/lavender theme. Avoid old warm/yellow styling.

## 56. Demo SEO Metadata

Update `/demo` metadata for AI restaurant phone demo and demo call.

## 57. Contact Page Role

Decide whether `/contact` is a simple book-demo/contact page. Keep it, but do not compete with `/demo`.

## 58. Contact Page Theme

Restyle `/contact` to match theme. Keep mailto fallback and form preview behavior if present.

## 59. Contact Copy

Copy: “Send your menu. We’ll show where calls become orders.” Keep fields simple.

## 60. Contact CTA QA

Ensure mailto uses `hello@getroal.com`; no broken submit flow.

## 61. Login Theme Audit

Audit `/login` styling and auth form. Do not change authentication logic.

## 62. Login Theme Update

Style `/login` with public theme: glass panel, lavender background wash, black button, readable form.

## 63. Signup Theme Audit

Audit `/signup` styling and redirect behavior. Do not change auth logic.

## 64. Signup Theme Update

Style `/signup` with public theme. Make it feel like a launch-ready onboarding entry.

## 65. Auth Copy Polish

Polish login/signup copy: clear, short, no jargon. Mention restaurant workspace after sign-in.

## 66. Auth Accessibility

Check labels, focus rings, errors, magic link state, and mobile form layout.

## 67. Auth Smoke Check

Verify login/signup render, email input can be typed, and buttons still call existing auth actions. Do not submit real credentials.

## 68. Security Page Theme

Restyle `/security` to match public theme. Keep trustworthy, readable sections.

## 69. Security Copy Polish

Plain-language security copy: scoped access, guest data, audit trail, human handoff, signed tools. No deep jargon above fold.

## 70. Security FAQ

Add a small security FAQ for SEO/AEO.

## 71. Legal Starter Links

Add simple footer links for Privacy and Terms only if pages exist or create lightweight placeholder pages. Do not overbuild legal copy.

## 72. Privacy Placeholder

If missing, create `/privacy` lightweight placeholder with honest “draft policy” language and contact email.

## 73. Terms Placeholder

If missing, create `/terms` lightweight placeholder with honest “pilot terms may vary” language and contact email.

## 74. Sitemap Update

Ensure sitemap includes public routes: home, pricing, blog, about, demo, contact, security, privacy/terms if created.

## 75. Robots Check

Check `robots.ts` and metadata so public pages are indexable and dashboard/auth-sensitive routes are not overexposed.

## 76. Open Graph Defaults

Improve metadata/OG for public pages. Use text-first OG if no image exists; do not add heavy image generation.

## 77. Launch FAQ Global

Create reusable FAQ data for homepage/pricing/security if helpful. Keep FAQ content consistent.

## 78. AEO Answer Blocks

Add concise answer blocks to pricing/blog/about pages where useful. Make them natural, not keyword stuffed.

## 79. Metrics Copy Safety

Audit all metrics for truthfulness. If not real, label as example/pilot metrics. Remove fake guaranteed claims.

## 80. Product Language Safety

Audit copy for claims like “perfect accuracy” or “guaranteed savings”. Replace with credible language.

## 81. Visual Consistency Pass

Scan all public pages for old yellow/cream/blue styling. Convert to lavender/black/glass theme where appropriate.

## 82. Component Reuse Pass

Reuse public components for page hero, CTA band, metric card, FAQ, and page shell. Avoid duplicating huge markup.

## 83. Motion Consistency

Use subtle reveal and glass hover effects. Do not add heavy animation everywhere. Respect reduced motion.

## 84. Background Consistency

Use the homepage video only where appropriate. Other pages can use gradient wash from same palette, not full video unless lightweight.

## 85. Button Consistency

Align all public CTAs: black primary pill, glass secondary, consistent labels.

## 86. Forms Consistency

Align contact/auth forms with the theme. Keep accessibility and input contrast strong.

## 87. Mobile Nav QA

Check mobile nav across home/blog/pricing/about/demo/login. Fix drawer, focus, overflow.

## 88. Mobile Page QA

Check mobile layouts for home, pricing, blog, article, about, demo, login, signup. Fix overlapping text and cramped cards.

## 89. Desktop Page QA

Check desktop layouts for same routes. Avoid too-wide text and empty sections.

## 90. Cross-Link QA

Verify nav/footer/CTA links: pricing, blog, about, demo, login, signup, mailto. Fix dead links.

## 91. Blog Link QA

Verify blog index cards and related posts point to real slugs.

## 92. Pricing CTA QA

Verify pricing CTAs include demo and signup paths, plus mailto walkthrough if present.

## 93. Demo CTA QA

Verify `/demo` bottom has mailto demo call and signup immediately after it.

## 94. Auth Route QA

Verify protected dashboard links still redirect to login and login/signup pages render.

## 95. Performance QA

Check public bundle and homepage video loading. Keep video preload metadata, no giant new assets, no scroll reflow loops.

## 96. Accessibility QA

Run semantic/keyboard audit: headings, landmarks, aria, labels, contrast, focus, reduced motion.

## 97. Lint

Run `npm run lint`. Fix public/frontend issues only.

## 98. Build

Run `npm run build`. Fix public/frontend issues only. Do not chase unrelated backend/Supabase problems unless build fails because of imports.

## 99. Launch Docs

Update `docs/PUBLIC_LAUNCH_PLAN.md` with final routes, changes made, pages checked, CTAs, known gaps, and how to preview.

## 100. Final Summary

Summarize changed files, pages created/updated, pricing message, demo mailto, auth status, QA commands run, and remaining launch gaps.
