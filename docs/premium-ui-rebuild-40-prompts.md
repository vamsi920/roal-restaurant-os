# Premium UI Rebuild Cursor Prompt Queue

Use these in a fresh Cursor agent for `/Users/vamsi/Desktop/restaurant-agent`.

Goal: rebuild the public UI into a short, premium, beautiful, high-converting site. Do **not** add long pages. Do **not** add more generic cards. Preserve the current ethereal video/glass/lavender/black direction, but make it feel expensive, simple, and immediately understandable.

Current state:
- Homepage uses `LandingHomeShell`, `app/landing-home.css`, and `components/landing/home/**`.
- Video asset exists: `public/landing/hero-bg.mp4`.
- Root source MP4 also exists: `341ea41f409e49a6bf6fa01283cf8936.mp4`.
- Current public pages became too long/plain. Pricing and blog need a full visual reset.

Non-negotiables:
- Short site. Few sections. No long walls of text.
- Hero must feel like a million-dollar SaaS product.
- Pricing must be extremely simple: **Only pay for successful orders. $0.90/order.**
- Restore/verify background video on homepage.
- Keep a simple scroll story effect for “menu → phone → order → kitchen ticket”.
- Use catchy, direct copy. No jargon, no enterprise filler.
- Auth logic, Supabase logic, ElevenLabs logic must not be broken.
- Use Cursor MCPs where available for Supabase/auth/ElevenLabs verification.

## 1. Premium Reset Audit

Audit `/`, `/pricing`, `/blog`, `/demo`, `/login`, `/signup`, and public CSS. Write `docs/PREMIUM_UI_REBUILD_PLAN.md` with what looks bad, what to remove, what to keep, and exact files to edit. Do not code yet.

## 2. Preserve Theme Contract

In the plan, define the theme contract: video background, glass chrome, lavender/pink/amber wash, black pill CTAs, no center orbs, no yellow poster theme. Do not code yet.

## 3. Video Background Restore

Fix homepage background video visibility. Ensure `public/landing/hero-bg.mp4` is used, plays when reduced-motion/save-data are off, and has gradient overlay that does not hide it.

## 4. Video Background QA

Run local page check for `/`. Verify video element exists, source resolves 200, and visual background is not plain. Fix only video/layering issues.

## 5. Homepage Simplification

Reduce homepage to 5-6 excellent sections max: hero, proof metrics, scroll story, pricing teaser, FAQ, final CTA. Remove weak/plain sections.

## 6. Hero Premium Composition

Rebuild hero visual composition without changing theme: big headline, short lead, pricing pill, two CTAs, video visible behind, glass nav floating above. No clutter.

## 7. Hero Copy Pass

Rewrite hero copy to be direct and catchy: “Never miss a restaurant call again.” Lead under 22 words. Mention orders go to kitchen. No jargon.

## 8. Hero CTA Pass

Primary CTA: “Hear a demo call”. Secondary CTA: “Book a demo”. Book demo uses `mailto:hello@getroal.com`. Buttons must look premium.

## 9. Pricing Pill Polish

Make the floating pricing pill impossible to miss but elegant: “Only pay for successful orders · $0.90/order”. Link to `/pricing`.

## 10. Hero Mobile QA

Check mobile hero: video layer, H1, pricing pill, CTAs, nav. Fix overlap, tiny text, and horizontal overflow.

## 11. Metrics Strip Design

Replace any boring metrics with one refined trust strip: “Orders recovered”, “Hours saved”, “Staff interruptions reduced”. Label as pilot metrics/examples unless real.

## 12. Metrics Copy Safety

Audit metric wording so it inspires trust without fake guarantees. Use “track during pilot” or “example month” where needed.

## 13. Scroll Story Plan

Plan the scroll story: Scan menu → ROAL answers → guest orders → ticket hits kitchen. It should feel cinematic but simple. Do not code yet.

## 14. Scroll Story Build

Build the scroll story as one premium section with sticky visual on desktop and stacked steps on mobile. Avoid generic three-card layout.

## 15. Scroll Story Motion

Add subtle scroll progression: active step, ticket movement, call pulse. Use transform/opacity only; respect reduced motion.

## 16. Scroll Story QA

Test desktop and mobile scroll behavior. Fix stuck sections, overlap, bad spacing, and reduced-motion fallback.

## 17. Homepage Pricing Teaser

Create a short pricing teaser on homepage: “If it does not become an order, you do not pay.” Show `$0.90/order` clearly.

## 18. Homepage FAQ

Add compact FAQ at bottom with 5 questions max: pricing, setup, menu accuracy, human handoff, demo/onboarding. Keep answers short.

## 19. Homepage Final CTA

Final CTA should be simple: “Turn the next missed call into an order.” Buttons: Hear demo call, Book demo. No long paragraph.

## 20. Pricing Page Reset

Completely simplify `/pricing`. One main pricing hero/card, one “what counts” block, small FAQ, CTA. Remove multi-plan clutter.

## 21. Pricing Main Card

Create the pricing card: `$0.90` per successful order. Free for hangups, wrong numbers, small talk, abandoned calls. Beautiful glass style.

## 22. Pricing Copy Pass

Make pricing copy catchy and simple: “You only pay when a real order reaches your kitchen.” No enterprise filler.

## 23. Pricing FAQ QA

Make pricing FAQ short and useful. Verify it helps SEO/AEO but does not make page long.

## 24. Pricing Visual QA

Inspect `/pricing` desktop/mobile. It should feel premium and simpler than homepage, not like a dashboard report.

## 25. Blog Index Reset

Simplify `/blog`: premium journal hero, 3 featured posts, then compact grid. Remove overdone AEO blocks from the top if they make it ugly.

## 26. Blog Card Design

Redesign blog cards to match glass/lavender theme. Make cards editorial, spacious, and clickable. No yellow poster remnants.

## 27. Blog Article Template Reset

Simplify article pages: readable header, answer box, content, FAQ, CTA. Remove heavy table-of-contents or clutter if ugly.

## 28. Blog Copy Polish

For top 6 posts, tighten intro and CTA. Each should clearly lead readers toward trying ROAL without sounding salesy.

## 29. Demo Page Reset

Make `/demo` one beautiful simple page: video placeholder, 3-step preview, sample transcript/ticket, bottom CTA.

## 30. Demo CTA Fix

Bottom of `/demo`: “Book a demo call” mailto `hello@getroal.com`, then “Sign up”. Verify links.

## 31. Auth UI Polish

Polish `/login` and `/signup` to match premium theme. Do not change auth logic. Keep forms simple, readable, and trustworthy.

## 32. Auth Flow Smoke

Smoke-check login/signup render, fields type, buttons invoke existing auth handlers. Do not submit real credentials.

## 33. ElevenLabs UI Flow Audit

Audit dashboard voice-agent/ElevenLabs UI for obvious broken frontend flow. Do not rewrite backend. Note gaps in `docs/PREMIUM_UI_REBUILD_PLAN.md`.

## 34. ElevenLabs MCP/Tool Check

Ask Cursor to use available MCPs/tools to verify ElevenLabs-related env/config/routes where possible. Confirm no UI change broke agent setup/test flow.

## 35. Supabase/Auth MCP Check

Ask Cursor to use available Supabase/auth MCPs/tools to verify auth assumptions and public route rendering where possible. Do not push schema unless explicitly required.

## 36. Public Navigation QA

Verify nav links are minimal and useful: Pricing, Blog, Demo, Login/Sign up, maybe About. Remove clutter. Check desktop/mobile.

## 37. Visual Consistency Pass

Scan public pages for ugly/plain sections, old yellow/blue styles, and generic cards. Convert or remove. Keep pages short.

## 38. Accessibility And Motion QA

Check headings, landmarks, focus, contrast, reduced motion, video fallback, and scroll story accessibility. Fix public UI issues.

## 39. Build And Browser QA

Run lint/build. Browser-check `/`, `/pricing`, `/blog`, one article, `/demo`, `/login`, `/signup`. Fix visible public issues only.

## 40. Final Premium Summary

Summarize final pages, files changed, video status, pricing message, auth status, ElevenLabs/Supabase check status, QA commands, and remaining launch blockers.
