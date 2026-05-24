# Simple Landing Reset Prompt Queue

Use these in a fresh Cursor agent for `/Users/vamsi/Desktop/restaurant-agent`.

Goal: reset the overbuilt landing from the last 40 prompts and craft one simple, premium, layman-friendly landing page. Do not create more marketing pages. Do not add a link farm. Keep the page focused on one idea: **never miss a call; ROAL answers like a human and turns calls into orders.**

Reference style from attached images:
- Clean white/cream canvas with black text and one bright accent.
- Friendly illustrated hero, chunky rounded panels, bold simple headings.
- Short sections, very little copy, brochure-style flow.
- Minimal nav. No dense chapter links. No footer link farm.
- Motion should be subtle and delightful: reveal, floating illustration, ticket movement.

Local reference image paths if visual inspection helps:
- `/tmp/codex-remote-attachments/019e38e9-7cf8-7643-a71d-ed9fd29406bc/C0B29BE3-064D-41B9-BD25-5358E979175F/1-Pasted-Image-1.jpg`
- `/tmp/codex-remote-attachments/019e38e9-7cf8-7643-a71d-ed9fd29406bc/C0B29BE3-064D-41B9-BD25-5358E979175F/2-Pasted-Image-2.jpg`
- `/tmp/codex-remote-attachments/019e38e9-7cf8-7643-a71d-ed9fd29406bc/C0B29BE3-064D-41B9-BD25-5358E979175F/3-Pasted-Image-3.jpg`

Hard scope:
- Change only landing/marketing files: `app/page.tsx`, `app/landing.css`, `components/landing/**`, and landing copy/helpers if required.
- Do not touch dashboard, auth, Supabase, KDS backend, APIs, migrations, tests outside landing.
- Remove or stop using the overbuilt chapter-heavy landing components from the home page.
- Keep `/demo`, `/pricing`, `/security`, `/contact` files if needed, but do not push many links to them from the homepage.

## 1. Reset Landing Scope

Audit current landing files and write `docs/LANDING_SIMPLE_RESET.md` with the exact files to replace or stop using. Plan a single homepage with 5 sections max: hero, why it matters, how it works, pay on orders, final CTA. No code yet.

## 2. Remove Overbuilt Home Imports

Refactor `components/landing/landing-page.tsx` to stop importing the old chapter/deferred/story components. Keep the file compiling with a temporary simple skeleton: hero, three cards, final CTA. Do not delete files yet.

## 3. Simplify Marketing Shell

Simplify `MarketingShell` so the homepage has only a clean wrapper, skip link, simple nav, main, and simple footer. Remove scroll-progress/chapter choreography from the shell for now.

## 4. Minimal Nav

Create a minimal nav inspired by the references: logo left, two small links max (`How it works`, `Try demo`), one CTA button. No chapter nav, no pricing/security/contact link clutter.

## 5. Simple Footer

Replace the footer with one compact footer: short line, copyright, optional `Demo` and `Login` only. No columns, no product/company/platform link farm.

## 6. Visual Direction CSS

Reset landing CSS toward a clean brochure style: warm off-white background, black ink, one lime or orange accent, rounded panels, thick black outlines, soft cream/yellow blocks. Keep dashboard CSS untouched.

## 7. Type Scale

Tune landing typography for laymen: big bold H1, short readable body, no technical jargon. Use existing fonts only. Avoid tiny dense paragraphs. Mobile text must fit cleanly.

## 8. Hero Copy

Rewrite hero copy to this idea: “Never miss a restaurant call again.” Subcopy: “ROAL answers, talks like a real person, takes the order, and sends it to your kitchen.” Keep it under 35 words.

## 9. Hero CTA

Make hero CTAs simple: primary “Try a demo call” and secondary “See how it works”. No success-pricing wording in hero.

## 10. Hero Illustration Base

Build a custom CSS/SVG-style hero illustration: phone, smiling voice agent, food bag, and kitchen ticket. Use black line art with one bright accent like the reference images. No stock photos.

## 11. Hero Illustration Motion

Add subtle hero motion: phone pulse, floating accent dots, ticket slides from phone to kitchen. Respect reduced motion. Transform/opacity only.

## 12. Trust Strip

Add a simple trust strip under hero with 3 plain badges: “Answers calls”, “Takes orders”, “Sends tickets”. No fake logos.

## 13. Problem Section

Create a short “Busy shift” section: one bold heading and 3 visual beats: phone rings, staff is busy, order is missed. Keep each beat under 12 words.

## 14. Problem Visual

Make the problem section visual like a comic strip or rounded storyboard. Use cream/black/accent panels, not long text.

## 15. Solution Section

Create a “What ROAL does” section with 3 big cards: talks naturally, knows your menu, sends the order. Use very simple language.

## 16. Solution Card Visuals

Add small custom visuals inside the 3 cards: chat bubbles, menu sheet, kitchen ticket. Keep them consistent with the hero line-art style.

## 17. How It Works Copy

Create a 3-step section: upload menu, connect phone, start taking orders. No technical terms like Supabase, RLS, Edge Functions, RPC, webhooks.

## 18. How It Works Layout

Style the 3-step section like the references: chunky rounded horizontal cards on desktop, stacked on mobile. Use numbered accent circles.

## 19. Pay Only For Orders Section

Create one clear section: “Only pay when an order is successful.” Explain in 2 short sentences max. Avoid exact prices or unsupported claims.

## 20. Pay Section Visual

Add a simple invoice/ticket visual: calls answered, chats ignored, successful order charged. Make it obvious without technical copy.

## 21. Demo Strip

Add a friendly demo strip: “Hear how it talks.” Show a tiny transcript of 3 lines. Button goes to `/demo`. Keep it compact.

## 22. Remove Dense Product Stack

Remove from homepage any long enterprise/product-stack sections: security chapters, pilot metrics, detailed KDS explanations, long calculators, competitor sections, audio grids.

## 23. No Extra Pages In Nav

Ensure homepage nav and footer do not push `/pricing`, `/security`, `/contact` unless absolutely necessary. One demo link is enough.

## 24. Copy Cleanup

Rewrite all homepage copy for a nontechnical restaurant owner or student. Short words, short sentences, no enterprise jargon.

## 25. Reference Image Style Pass

Apply the attached reference style: white canvas, bold black text, neon accent labels, thick rounded rectangles, playful illustration, strong whitespace.

## 26. Layout Rhythm

Make page flow feel like one clean poster: hero, strip, cards, process, payment, CTA. Avoid too many sections and avoid massive scrolling.

## 27. Button Polish

Polish buttons: black primary pill/rounded rectangle, accent hover, clear focus state, no cramped text. Add small arrow icon only if it fits.

## 28. Card Polish

Use fewer, better cards. Each card must have stable dimensions, clear visual, one heading, one short sentence. No nested cards.

## 29. Mobile First QA

Audit mobile homepage. Fix line breaks, tap targets, card stacking, illustration size, and horizontal overflow. The page must look good on iPhone width.

## 30. Desktop QA

Audit desktop homepage. Keep max width like the reference poster. Avoid full-width sprawl. Hero should look composed, not empty.

## 31. Motion QA

Keep motion delightful but light: entry reveals, hero float, ticket movement. Remove heavy scroll choreography and long pinned sections.

## 32. Accessibility QA

Check headings, landmarks, buttons, links, alt/aria for illustration, focus rings, contrast, and reduced motion.

## 33. Performance QA

Remove unused heavy landing imports from the homepage path. Avoid loading old deferred chapter components. Run lint/build if possible.

## 34. Demo Page Light Touch

If `/demo` looks broken from landing changes, lightly align it with the new simple visual style. Do not expand it. Keep it secondary.

## 35. Delete Or Ignore Dead Landing Components

If old chapter components are no longer imported anywhere, either leave them unused or delete only clearly landing-only files. Do not touch product/dashboard components.

## 36. Metadata Update

Update homepage metadata to match the simple promise: never miss restaurant calls, AI takes orders, sends kitchen tickets. Keep it plain.

## 37. Visual Screenshot Check

Run the app and inspect `/` at mobile and desktop. Fix obvious visual issues: overlap, tiny text, broken spacing, unreadable sections.

## 38. Final Copy Pass

Read the homepage like a first-time visitor. Remove any sentence that does not help them understand the offer in 10 seconds.

## 39. Final Landing Build Check

Run `npm run lint` and `npm run build`. Fix landing-only issues. Do not chase unrelated backend/dashboard problems.

## 40. Final Summary

Summarize the final homepage structure, files changed, links kept, links removed, and any remaining landing gaps. Confirm the homepage is simple and not text-heavy.
