# Launch Finalization - 40 Sequential Cursor Prompts

Use these in a new Cursor Agent for `/Users/vamsi/Desktop/restaurant-agent`.

Sequential rules:
- Run these one by one. Do not use Cursor Multitasking.
- This is a final launch-readiness pass, not a broad redesign.
- Use terminal, browser automation, Supabase MCP, ElevenLabs/API helpers, and available Cursor skills/MCPs.
- Do not print secrets. You may inspect `.env` / `.env.local`, align env files, set Supabase Edge secrets if available, and redeploy Edge Functions when required.
- Do not ask the user to run commands, SQL, or manual QA unless an external account permission or a real phone call is impossible from Cursor.
- Fix proven issues only. Preserve working product behavior and current visual theme.
- Keep `docs/FLOW_QA_REPORT.md`, `docs/LAUNCH_BLOCKERS.md`, and `docs/FINAL_LAUNCH_READINESS.md` updated.

## 01. Snapshot prior QA and current Cursor results
Read `docs/FLOW_QA_REPORT.md`, `docs/LAUNCH_BLOCKERS.md`, git status, and recent Cursor-generated files. Create `docs/FINAL_LAUNCH_READINESS.md` with a concise snapshot: what passed, what was fixed, what remains open, and which files changed. Do not modify product code.

## 02. Triage the current diff for launch risk
Review all changed/untracked files. Classify them as product, tests/scripts, docs, generated artifacts, or accidental junk. Do not delete user work blindly. If a file is clearly temporary or unsafe to ship, remove or ignore it with a minimal documented change. Update `FINAL_LAUNCH_READINESS.md`.

## 03. Enterprise visual audit: public site
Browser-test `/`, `/pricing`, `/blog`, `/blog/ai-phone-ordering-small-restaurants`, `/about`, `/demo`, `/contact`, `/security`, `/login`, `/signup` on desktop and mobile. Audit typography, spacing, buttons, nav, page density, visual hierarchy, and theme consistency. Record screenshots/findings. Fix only obvious cheap-looking or broken UI.

## 04. Polish the landing page without changing the concept
Keep the current short story landing page and theme. Tighten hero, pricing pill, metrics, how-it-works, FAQ, CTA, and footer so it feels premium and restaurant-owner friendly. No extra long sections. Verify desktop/mobile after edits.

## 05. Polish pricing for clarity and trust
Make `/pricing` extremely simple and high-converting: lead with “Only pay for successful orders”, `$0.90/order`, what counts, what does not count, pilot setup, and CTA. Remove confusing plan clutter. Keep enterprise visual quality. Verify responsive.

## 06. Polish blog index and article template
Make blog pages match the landing theme without yellow/off-brand styling. Keep copy readable, SEO/AEO intact, and cards clean. Fix typography, spacing, mobile, CTAs, and related posts if needed. Do not rewrite every article unless broken.

## 07. Polish auth pages as launch onboarding
Review `/login` and `/signup`. Make them feel trustworthy and premium, not generic. Confirm password/email fields, errors, `next` redirects, mobile layout, and no visual mismatch with public theme. Fix only UI/UX and proven auth issues.

## 08. Polish demo, about, contact, legal pages
Keep these pages short and clear. Ensure `/demo` has the video placeholder area, CTA to email/sign up, and polished sample call/ticket. Ensure `/about` and `/contact` build trust. Legal pages should be readable and theme-consistent.

## 09. Dashboard shell enterprise UX pass
Sign in or create a safe QA account if needed via Supabase/Auth tooling. Browser-test the dashboard shell, nav, empty states, loading states, and responsive behavior. Fix anything that feels cheap, broken, confusing, or off-theme.

## 10. Restaurant workspace/KDS UX pass
Test the restaurant detail page. Polish KDS order panels, live menu sidebar, restaurant profile/hours cards, menu scanner, and voice agent area. Keep operational UI dense but clean. Fix layout overflow, weak hierarchy, and broken states.

## 11. Onboarding UX live pass
Run onboarding as a real or safe QA user. Create org/restaurant, continue/resume steps, verify redirects, skip/complete voice step, and ensure the flow is clear enough for a restaurant owner on day one. Fix broken or confusing steps.

## 12. Menu scanner live pass
Use a realistic menu image fixture or create one if needed. Test extract, review, commit, discard, error, and history. Confirm Gemini/scanner failures show useful messages. Fix issues that would block a restaurant from uploading a menu.

## 13. Menu editor live pass
Test adding/editing/deleting categories, items, prices, availability, and modifiers. Confirm saved menu appears in live menu sidebar and Edge `get-menu`. Fix editor bugs, stale refresh, or bad empty/error states.

## 14. Phone order/KDS live pass
Using Edge tool simulation or exact ElevenLabs-style calls, create a draft order, update it, finalize it, and verify KDS shows the ticket. Test status transitions and refresh/poll fallback. Fix any day-one order flow issues.

## 15. Voice agent panel final pass
Test Connect/Re-sync agent from the restaurant page. Confirm it persists agent id, bakes restaurant tools, shows safe errors, and gives clear next steps. Fix UI/action issues and update docs if the button behavior changed.

## 16. Close or shrink LB-01: production phone stack
Focus on `LAUNCH_BLOCKERS.md` LB-01. Verify app URL, conversation-init URL, ElevenLabs phone personalization, baked tools, and `get_menu_items` logs if accessible. If a real Twilio call cannot be made, simulate the exact tool call and document the only remaining human step.

## 17. Re-sync ElevenLabs tools for real restaurants
List connected restaurants/agents safely. Re-sync every configured restaurant agent so tool URLs, `apikey`, `Authorization`, `x-roal-restaurant-id`, prompt, first message, and conversation-init are current. Do not print secrets. Verify tool config after sync.

## 18. Verify `get_menu_items` as ElevenLabs calls it
For the active restaurant, call `get_menu_items` using the same URL/headers/body from the synced ElevenLabs tool. Confirm HTTP 200 and non-empty categories/items. If it fails, fix the first proven cause, redeploy/resync, and retest.

## 19. Verify draft and finalize tools as ElevenLabs calls them
Call `sync_draft_order` and `finalize_order` with exact synced tool config. Confirm KDS row, receipt row, usage event, idempotency, and no placeholder customer values accepted. Fix issues, redeploy/resync, and retest.

## 20. Close LB-03 if possible: signing secret parity
Check Next.js env and Supabase Edge secrets. If `AGENT_TOOL_SIGNING_SECRET` is available locally or can be safely derived from existing configured secret policy, set it on Edge, redeploy functions, re-sync agents, and update blockers. If impossible, document exact human action.

## 21. Billing launch posture
Review Stripe-disabled state. Make the UI honest: success-based pricing and pilot/manual billing are allowed, but no fake checkout. Ensure onboarding is not blocked by missing Stripe. Close or downgrade LB-02 if product can launch without self-serve checkout.

## 22. Notifications live pass
As an admin QA user, test notification settings save, delivery log, event API, stuck order check, redaction, and permission differences. Fix day-one bugs or mark human-only provider setup clearly.

## 23. Analytics live pass
With seeded or real QA orders/usage, verify analytics dashboard numbers, ranges, empty states, and chart layout. Fix incorrect aggregation, crashes, or cheap UI. Do not invent unsupported metrics.

## 24. Admin ops live pass
Verify admin dashboard access for owner/admin/member, health output, sanitized errors, and no secret leakage. Fix access-control or display bugs. Document any live environment action still needed.

## 25. Tenant isolation final confirmation
Using Supabase MCP and route tests, re-confirm no cross-org read/write leaks for restaurants, menu, orders, notifications, analytics, billing, and admin. Fix any leak immediately. Update final readiness docs.

## 26. Auth/session/security final confirmation
Verify signup/login, callback, signout, protected redirects, `next` safety, cookies, service-role isolation, public env exposure, and API 401/403 responses. Fix only real security bugs.

## 27. Production/deploy smoke readiness
Inspect deployment docs/scripts and actual env. Run safe smoke checks against local and production/staging URL if available. If production URL is unavailable, make the blocker exact and actionable. Do not fake pass results.

## 28. Full UI responsive sweep
Use browser screenshots at mobile, tablet, desktop for public pages and signed-in dashboard. Fix overlap, cramped buttons, unreadable text, poor contrast, weird font sizing, and off-brand colors. Keep pages short and premium.

## 29. Accessibility and performance sweep
Check labels, focus states, keyboard navigation, reduced motion, image/video fallbacks, public route load performance, and console errors. Fix launch-impacting issues. Avoid large refactors.

## 30. Error-state and empty-state sweep
Review scanner, KDS, voice agent, billing, notifications, analytics, admin, login/signup, and public forms. Ensure errors are useful and non-technical where customer-facing. Fix confusing states.

## 31. Docs cleanup for operator handoff
Update only useful docs: `FINAL_LAUNCH_READINESS.md`, `LAUNCH_BLOCKERS.md`, `ELEVENLABS.md`, `DEPLOYMENT.md`, and `TESTING.md` if needed. Remove stale instructions that conflict with current code. No doc spam.

## 32. Test suite stabilization
Run focused tests related to changed areas. Fix flaky tests, stale snapshots, broken imports, and docs/scripts references. Keep test changes minimal and meaningful.

## 33. Full local regression
Run `npm run lint`, `npm test`, and `npm run build`. Fix failures. If lint has an accepted warning, document it exactly. Update final readiness docs with final command outputs.

## 34. Browser E2E smoke
Run the available browser smoke scripts or Playwright flows with a local dev server. Cover public pages, auth render, dashboard redirects, and signed-in path if QA credentials/session can be created. Fix failures or document exact blocker.

## 35. Final manual-like customer journey
Simulate a restaurant owner journey: visit homepage, pricing, signup/login, create/onboard restaurant, scan menu, verify menu, connect voice agent, place simulated call/order, see KDS ticket, view analytics/billing. Fix blockers.

## 36. Final product copy pass
Remove technical jargon from customer-facing pages. Ensure copy says what ROAL does: answers calls, sounds human, uses live menu, sends kitchen ticket, only pay for successful orders. Keep claims honest and not overpromised.

## 37. Final code hygiene pass
Review changed code for obvious dead code, accidental console logs, secret leaks, duplicated styles, unused scripts, huge accidental assets, or broken imports. Clean only what is safe. Do not refactor unrelated systems.

## 38. Final launch blocker decision
Update `LAUNCH_BLOCKERS.md`: close fixed blockers, downgrade non-launch issues, and leave only real blockers with exact owner/action. If any P0 remains, stop and state why the app is not ready for day-one onboarding.

## 39. Prepare commit
Review `git status` and `git diff --stat`. Stage all intentional launch-readiness changes only. Write a clear commit message summarizing QA, UI polish, ElevenLabs/phone fixes, and launch readiness docs. Do not commit secrets or local-only env files.

## 40. Commit and push
If lint, tests, build, and launch-blocker decision are acceptable, commit and push the branch. If a P0 blocker remains or tests fail, do not push a broken state; instead document the blocker in `FINAL_LAUNCH_READINESS.md` and tell the user exactly what must be done.
