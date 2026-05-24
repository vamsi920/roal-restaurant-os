# Landing Story Rebuild Prompt Queue

Use these in a fresh Cursor agent for `/Users/vamsi/Desktop/restaurant-agent`. Scope is **landing/marketing only**: `app/page.tsx`, `app/pricing`, `app/demo`, `app/security`, `app/contact`, `components/landing/**`, landing helpers/data, landing CSS, and package deps only if needed for motion. Do not modify dashboard, Supabase, auth, KDS, menu, Edge Functions, or migrations.

Research notes to apply:
- SoundHound positions around first-ring answering, no missed opportunities, higher basket size, and off-premise order automation.
- VOIA, Takeorder, Serviio, TastyVox, Cleverli, Talk2Order, Appetell, Tunvo, and Orda mostly repeat: never miss a call/order, human-like voice, no hold time, handles rush-hour calls, menu-aware ordering, and analytics.
- Our landing should be more memorable: a cinematic story about the dinner rush, a missed call becoming lost revenue, and ROAL turning every answerable call into a live kitchen ticket.
- Core message: **Never miss a call. Let our agents handle it. They sound human, take real orders from your live menu, and you only pay for successful orders.**
- Use story-driven scroll, premium motion, strong product visuals, and clear restaurant-owner language. Avoid generic AI SaaS templates.

## 1. Landing Audit And Story Blueprint

Audit the current landing components only. Write a short story blueprint in `docs/LANDING_STORY_BLUEPRINT.md`: audience, competitor lessons, core promise, section order, motion concept, visual language, and exact files to change. Do not code yet.

## 2. Landing Design System Tokens

Refactor only landing CSS/tokens to support a cinematic restaurant story: premium type scale, dark rush-hour palette with warm ticket/kitchen accents, section spacing, focus states, motion easing variables, and responsive constraints. Keep dashboard styling intact.

## 3. Landing Motion Foundation

Create reusable landing motion utilities/components using existing `framer-motion` or lightweight IntersectionObserver. Add reveal, sticky chapter, counter, marquee, and scroll-progress primitives. Keep animations transform/opacity-only and mobile-safe.

## 4. Story Shell And Navigation

Rebuild `MarketingShell`/landing nav as a floating story controller: compact brand, chapter links, “See demo” and “Start with success pricing” CTAs. Add mobile overlay with accessible controls and smooth staggered reveal.

## 5. Hero Story Rewrite

Rewrite the hero around: “Never miss a call. Let our agents handle it.” Include subcopy: human-like voice, live menu ordering, kitchen ticket, pay only for successful orders. Keep H1 to 2-3 lines desktop and clear mobile.

## 6. Hero Visual Scene

Build a cinematic hero visual: phone ringing, rush-hour kitchen/KDS ticket, order flowing from call to kitchen. Use product UI panels, ticket cards, and restaurant visual texture. Make it feel unique and non-template.

## 7. Hero Motion Pass

Add hero motion: phone pulse, ticket slide-in, call-to-order path, subtle scroll cue, and CTA hover physics. No layout-shifting animations. Verify reduced-motion fallback.

## 8. Rush Hour Problem Chapter

Create a section that tells the missed-call problem as a short scroll story: 6:42 PM, line out the door, phone rings, staff cannot answer, order lost. Use dramatic copy and visual timeline.

## 9. Lost Revenue Calculator Teaser

Add a simple visual calculator-style section showing how missed calls become lost orders. Keep inputs static/demo only unless easy. Tie it to “only pay for successful orders.” Avoid fake unsupported claims.

## 10. Human-Like Agent Chapter

Build a chapter showing how the agent speaks naturally: short conversation transcript, interruptions, modifiers, clarifying questions, and friendly confirmation. Make it clear it sounds human but is transparent AI.

## 11. Conversation Motion

Animate the conversation transcript like a live call: message bubbles reveal on scroll, active waveform, customer/agent turns, and final confirmation. Keep accessible text available.

## 12. Live Menu Truth Chapter

Create a story section: “It does not guess. It reads your live menu.” Show menu scan → item/modifier database → agent response. Mention unavailable items and modifier rules.

## 13. Menu Scan Visual Upgrade

Upgrade existing menu scan preview into a premium visual: photo card, extraction rows, category chips, modifier groups, confidence/review hints. Keep it landing-only and data-driven from preview fixtures.

## 14. Kitchen Ticket Chapter

Build the chapter where the order becomes a kitchen ticket before the call ends. Show live cart, guest name/phone, prep status, and KDS visibility.

## 15. KDS Motion Scene

Add scroll-driven KDS animation: draft ticket enters, modifiers attach, status changes from new to accepted to ready. Keep it illustrative, not connected to real DB.

## 16. Success Pricing Chapter

Create a strong section around “Only pay for successful orders.” Explain in simple terms: no charge for missed experiments or chatter, value tied to completed orders. Avoid hard pricing if not implemented.

## 17. Success Pricing Visual

Build a premium pricing visual: call attempts vs confirmed orders, invoice line “successful orders,” pilot CTA, and comparison to hiring phone staff. Use careful copy, no unsupported exact savings.

## 18. Setup In 20 Minutes Chapter

Rework setup section into a story: upload menu, review, connect phone agent, run test order, forward calls. Keep “20 minutes” but phrase as typical guided setup/pilot, not guaranteed for every restaurant.

## 19. Setup Timeline Motion

Animate the setup timeline with sticky progress and chapter cards. Each step should reveal a product visual and a simple operator action.

## 20. Differentiator Bento

Create a gapless premium bento of differentiators: human-like call flow, live menu truth, KDS sync, successful-order pricing, rush-hour concurrency, staff handoff. Avoid generic icons; use mini product visuals.

## 21. Competitor Contrast Section

Add a tasteful “what makes this different” section without naming competitors: not just call answering, not a chatbot, not a static script. It is a menu-aware phone agent tied to a live kitchen workflow.

## 22. Trust And Safety Chapter

Build trust section: secure menu/order data, scoped restaurant tools, no invented customer info, human handoff, audit-ready order trail. Make it understandable to nontechnical restaurant owners.

## 23. Human Handoff Story

Add a section for edge cases: catering request, angry customer, allergy concern, manager question. Show agent routing/handoff instead of pretending AI handles everything.

## 24. Social Proof Placeholder

Create tasteful pilot/testimonial placeholders without fake customer logos. Use “pilot metrics to track” cards: missed calls recovered, confirmed orders, staff interruptions reduced, order accuracy.

## 25. Audio Demo CTA

Add a “hear the agent” section with demo call cards for pizza, cafe, diner, and late-night pickup. If no audio assets, create accessible disabled/coming-soon state and route to `/demo`.

## 26. Demo Page Alignment

Update `/demo` to match the story landing: call simulation, conversation, menu/KDS preview, success-pricing explainer. Keep it static and polished.

## 27. Pricing Page Alignment

Update `/pricing` around success-based pricing and pilots. Include clear caveat that final production pricing can vary by volume/integrations. Make it restaurant-owner friendly.

## 28. Security Page Alignment

Update `/security` to explain in plain language: scoped access, signed tool calls, no secret leakage, order audit trail, human control. Avoid overtechnical copy above the fold.

## 29. Contact Page Alignment

Update `/contact` with a restaurant-owner conversion form/story: “Show us your menu; we will show you your missed-call recovery path.” Keep form static if backend missing.

## 30. Footer Story Close

Redesign the footer as final story close: “The next call does not have to go unanswered.” Include CTAs, pages, pilot invitation, and concise trust copy.

## 31. Scroll Choreography Pass

Add cohesive scroll effects across the page: chapter progress, pinned moments, staggered reveals, ticket stack, horizontal scene only if mobile-safe. Respect `prefers-reduced-motion`.

## 32. Visual Texture Pass

Add premium restaurant-operational texture: ticket paper, stainless counter hints, phone waveform, kitchen heat/time cues, subtle grain. Avoid decorative blobs/orbs and avoid stock-looking darkness.

## 33. Mobile Story QA

Audit mobile: H1 line length, sticky sections fallback, tap targets, no horizontal overflow, no overlapping text, readable charts/tickets. Fix landing-only mobile issues.

## 34. Accessibility QA

Audit landing accessibility: semantic headings, aria labels, focus-visible, reduced motion, color contrast, readable transcript, no motion-only meaning. Fix landing-only issues.

## 35. Performance QA

Audit landing performance: bundle size, animation cost, image/asset loading, no scroll event reflow loops, transform/opacity animations only. Fix landing-only performance issues.

## 36. Copy Tightening Pass

Rewrite copy for a layman restaurant owner. Remove jargon like RLS, webhook, RPC from landing pages. Keep technical trust points only on security page. Make every section answer “why should I care?”

## 37. CTA And Conversion QA

Verify all CTAs point to useful routes, labels are clear, and the success-pricing/pilot path is obvious. Ensure no dead links or dashboard links that require context unexpectedly.

## 38. Landing Visual Regression

Run lint/build. If possible use browser screenshots at desktop, tablet, and mobile for `/`, `/pricing`, `/demo`, `/security`, `/contact`. Fix visible landing issues only.

## 39. Landing Docs Update

Update `docs/LANDING_STORY_BLUEPRINT.md` with final structure, motion choices, competitor inspiration, remaining assets needed, and QA status. Keep it concise.

## 40. Final Landing Polish

Final landing-only pass: remove generic SaaS sections, align spacing, polish transitions, fix copy, check mobile/desktop, run `npm run lint` and `npm run build`. Summarize changed files and remaining gaps.
