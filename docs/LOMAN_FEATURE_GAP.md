# Loman-inspired feature gap — ROAL pass 01/40

**Source:** [loman.ai](https://loman.ai) marketing and product positioning (May 2026).  
**Scope:** Map Loman-style targets to the ROAL codebase (`/Users/vamsi/Desktop/restaurant-agent`).  
**Out of scope (this pass):** POS integrations (Toast, Square, Clover, etc.), phone card capture, payment rails, reservation system sync.

**Legend**

| Status | Meaning |
|--------|---------|
| **Present** | Shipped behavior with clear code paths |
| **Partial** | Core exists; parity gaps vs Loman command center |
| **Gap** | Not implemented or demo/marketing only |

---

## Loman targets (condensed)

Loman positions a **24/7 restaurant voice AI** with a single **command center**: answer every call, take pickup/delivery orders, answer menu/hours/FAQ questions, show **live calls + transcripts**, **orders and outcomes**, fast **menu/hours/business updates**, **upsell**, **analytics** (revenue, conversion, peak times), **staff handoff**, and **multi-location** rollups. This doc tracks ROAL against that story **excluding POS and payments**.

---

## Feature map

### 1. Phone orders (pickup / delivery conversation → kitchen ticket)

| | |
|---|---|
| **Loman** | AI takes pickup and delivery orders; unlimited concurrent calls; tickets to kitchen (Loman also sends to POS — excluded here). |
| **Status** | **Partial** |

**ROAL files**

| Area | Path |
|------|------|
| Voice tools (menu, business info, draft sync, finalize, status lookup) | `supabase/functions/get-menu/index.ts`, `supabase/functions/get-restaurant-info/index.ts`, `supabase/functions/sync-draft-order/index.ts`, `supabase/functions/finalize-order/index.ts`, `supabase/functions/get-order-status/index.ts` |
| Tool schemas / auth | `supabase/functions/_shared/agent-tool-schemas.ts`, `lib/agent-tools/*` |
| Agent behavior | `lib/elevenlabs/agent-prompt.ts` |
| ElevenLabs wiring | `lib/sync-elevenlabs-roal-tools.ts`, `app/api/integrations/elevenlabs/sync-roal-tools/route.ts`, `app/dashboard/restaurants/[id]/voice-agent-actions.ts`, `lib/voice-agent/control-center.ts` |
| Call → restaurant binding | `app/api/integrations/elevenlabs/conversation-init/route.ts`, `lib/elevenlabs/conversation-init.ts`, `lib/elevenlabs/phone-personalization.ts` |
| KDS / live orders UI | `app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx`, `KitchenOrderCard.tsx`, `useOrderStatusActions.ts` |
| Order model | `lib/order-status.ts`, `lib/orders/*`, migrations `draft_orders`, `phone_order_receipts` |
| Usage metering | `supabase/functions/_shared/record-usage.ts`, `lib/usage/record.ts` |
| Tests | `lib/voice-agent/test-harness/*`, `tests/integration/api-elevenlabs-*`, `tests/unit/voice-agent-harness.test.ts` |

**Gaps**

- **Delivery address capture is now present** for voice orders: `sync_draft_order` and `finalize_order` accept `fulfillment_type`, `delivery_address`, and `delivery_instructions`; delivery finalization requires an address; KDS cards and order detail modals display delivery context. Remaining gap vs Loman: no driver dispatch, delivery-zone/radius validation, or POS delivery ticket sync.
- **Phone-order timeline is now present** in the KDS order detail modal: call received, live cart building, ticket sent, kitchen accepted, preparing, ready, completed, and canceled milestones are shown with owner-readable descriptions.
- **Concurrent call** capacity is delegated to ElevenLabs; ROAL does not surface concurrency or queue depth in-product.
- **Order status by phone** is now a first-class agent capability via `get_order_status`; the caller can ask whether a matching pickup order is ready / being prepared / completed, looked up by session, phone, or name.
- **Returning caller recognition** is now a first-class agent capability via `get_caller_history`; after the guest states a phone/name or asks for their usual, the agent can safely use completed receipt history to offer prior/favorite items without assuming consent.
- **Reservation request intake** is now available via `submit_reservation_request`; the agent can collect name, callback phone, party size, requested date/time, and notes, then save a staff-confirmation request. It intentionally does **not** claim a table is confirmed or sync to a reservation platform.

---

### 2. FAQs (hours, menu, allergens, directions, policies)

| | |
|---|---|
| **Loman** | Accurate answers from business knowledge; menu and allergen questions; hours, directions, wait times. |
| **Status** | **Partial** |

**ROAL files**

| Area | Path |
|------|------|
| Prompt: hours, address, dietary, policies | `lib/elevenlabs/agent-prompt.ts` (`buildRestaurantIdentitySection`, `buildOrderingPolicySection`, `buildMenuRulesSection`) |
| Live menu truth for Q&A | `supabase/functions/get-menu/index.ts`, `supabase/functions/_shared/load-restaurant-menu.ts`, `supabase/functions/_shared/restaurant-hours.ts` |
| Live business facts for Q&A | `supabase/functions/get-restaurant-info/index.ts`, `GetRestaurantInfoResponseSchema`, `get_restaurant_info` ElevenLabs tool |
| Profile (address, phone, cuisine, closure) | `lib/restaurant-profile/schema.ts`, `helpers.ts`, `app/dashboard/restaurants/[id]/RestaurantProfileSettings.tsx` |
| Operator FAQ / knowledge entries | `restaurant_knowledge_entries`, `lib/restaurant-knowledge/*`, `RestaurantProfileSettings.tsx`, `buildRestaurantOrderAgentPrompt` |
| Weekly hours + exceptions | `lib/restaurant-hours/core.ts`, `app/dashboard/restaurants/[id]/RestaurantHoursSettings.tsx`, `hours-actions.ts` |
| Marketing FAQ (not operator KB) | `lib/landing/launch-faq.ts`, `components/landing/public/*` |

**Gaps**

- **Structured FAQ / knowledge base exists** for operator-approved answers. It stores active entries per restaurant, exposes a compact editor in Restaurant basics, injects entries into the ElevenLabs prompt on sync, and is returned live by `get_restaurant_info`.
- **Wait-time / directions / business info tool exists** via `get_restaurant_info`, returning open/closed state, address fields, phone, website, pickup/delivery modes, prep-time estimate, and active FAQ entries.
- Analytics show FAQ/no-order call counts by location from post-call outcomes; no dedicated analytics on which FAQ entries are asked most often.
- **Multi-language** (Loman FAQ) — **Gap** in product (English-first prompt).
- **Repeat caller recognition** — **Gap** (no CRM / caller ID persistence in app DB).

---

### 3. Live calls (see active calls, listen/read along)

| | |
|---|---|
| **Loman** | Command center shows **live calls**, transcripts, and call activity in one place. |
| **Status** | **Partial** |

**ROAL files**

| Area | Path |
|------|------|
| “Call live” strip on KDS | `app/dashboard/restaurants/[id]/CallStatusStrip.tsx` — driven by `liveCount={liveCarts.length}` in `LiveOrdersPanel.tsx` (**active draft carts**, not telephony sessions) |
| Voice agent ops (connect/sync, not call feed) | `app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx`, `agent/page.tsx` |
| Illustrative transcript (marketing) | `components/landing/chapters/conversation-transcript.tsx`, `lib/landing/agent-conversation-demo.ts` |
| Conversation bootstrap | `lib/elevenlabs/conversation-init.ts` |
| Post-call ingestion | `app/api/integrations/elevenlabs/post-call-webhook/route.ts`, `lib/elevenlabs/post-call-webhook.ts`, `agent_call_events` |

**Gaps**

- **Call-start ingestion exists** through conversation-init when ElevenLabs/Twilio supplies a conversation/session/call id; ROAL upserts an active `agent_call_events` row.
- **Post-call ingestion exists** for ElevenLabs `post_call_transcription`, `post_call_audio`, and `call_initiation_failure` events. It verifies `ElevenLabs-Signature`, resolves the restaurant from dynamic variables or the saved agent id, and upserts `agent_call_events` with transcript metadata/outcome.
- Call History now classifies each call into owner-readable intents (live call, order, reservation, staff handoff, voicemail, menu/info, other), links reservation requests back to their call session, and shows command-center summary cards for active calls, orders won, action-needed calls, transcripts, and recordings.
- Live Orders now subscribes to `agent_call_events`, so call-start rows and post-call transcript evidence can update the command-center UI without a full page refresh. No word-by-word live transcript streaming UI / audio monitor yet. Post-call transcript summaries and turns are available in Call History and in the KDS order detail modal when `agent_call_events.transcript_metadata` is present for that session.
- Call History shows **post-call transcript lines** plus recording links when ElevenLabs webhook metadata includes transcript rows and a safe `recording_url` / `audio_url`. ROAL still does not host or retain audio files itself.
- `CallStatusStrip` still tracks **in-progress draft orders** — acceptable for KDS, but not full Loman “live calls.”

---

### 4. Orders & outcomes (transcripts + order funnel in one place)

| | |
|---|---|
| **Loman** | Orders, outcomes, and call history unified in the command center. |
| **Status** | **Partial** |

**ROAL files**

| Area | Path |
|------|------|
| Kitchen outcomes | `LiveOrdersPanel.tsx`, `OrderDetailModal.tsx`, `lib/orders/merge-fetched-orders.ts` |
| Receipts / finalize | `supabase/functions/finalize-order/index.ts`, migration `007_phone_order_receipts.sql` |
| Usage outcomes | `lib/usage/types.ts`, `record-usage.ts` (`voice_order`, `order_completed`, status metadata) |
| Org / location analytics tie-in | `lib/analytics/load-analytics.ts`, `lib/analytics/aggregate.ts` |

**Gaps**

- **Call-level outcome taxonomy exists** for active, completed, abandoned, canceled, no-order, and unknown calls; the restaurant Calls page also derives owner-facing intents and action labels from transcripts, reservation requests, order rows, and handoff flags.
- Post-call transcript metadata, sanitized transcript lines, safe recording links, reservation requests, owner action labels, and call intent classification are linked to call sessions in Call History. KDS order details now show call/cart/ticket/kitchen/completion milestones plus the stored call summary, transcript turns, and recording link for the selected session when available.
- **Finalize vs KDS complete** are now visible in the order detail timeline as distinct ticket/kitchen/completion milestones; full turn-by-turn live transcript streaming is still pending.

---

### 5. Menu & hours updates (fast operational changes)

| | |
|---|---|
| **Loman** | Update menu, hours, and business info in seconds; agent immediately reflects changes. |
| **Status** | **Partial** |

**ROAL files**

| Area | Path |
|------|------|
| Menu editor + scanner | `app/dashboard/restaurants/[id]/menu/MenuEditor.tsx`, `MenuSetupWorkspace.tsx`, `MenuScanner.tsx`, `menu-actions.ts` |
| Menu API | `app/api/restaurants/[id]/menu/route.ts` |
| Hours UI + server actions | `RestaurantHoursSettings.tsx`, `hours-actions.ts` |
| Agent menu snapshot / sync | `lib/elevenlabs/load-menu-prompt-snapshot.ts`, `app/dashboard/restaurants/[id]/elevenlabs-actions.ts`, `resync` in `voice-agent-actions.ts` |
| Live menu in calls | `get-menu` edge function (always reads DB at invoke time) |
| Shared menu templates | `organization_menu_templates`, `MenuCopyFromLocation.tsx`, `saveMenuTemplateAction`, `setDefaultMenuTemplateAction`, `applyMenuTemplateAction`, `applyTemplateToInheritedLocationsAction` |

**Gaps**

- Menu **availability** updates apply on next `get_menu_items` call; prompt text, tools, FAQ, hours, and policy updates can be explicitly pushed through the **Publish to voice** control on the menu workspace.
- The **Publish to voice** action runs the same content-sync path as auto-sync, updates the profile sync status, bakes tool URLs, and surfaces failure state to the operator.
- Shared menu templates exist for saving a brand menu, marking a default template for new locations, applying a template to one location, and pushing a template to all locations that already inherited it. Local edits on inherited locations are tracked; brand pushes replace unchanged inherited stores and add missing brand categories/items to customized stores without overwriting local item edits. Customized-store pushes also calculate field-level diffs so operators can see preserved local price, description, availability, modifier, and local-only-item overrides.

---

### 6. Upsell (add-ons, combos, ticket lift)

| | |
|---|---|
| **Loman** | Smart prompts for add-ons and combos; measurable ticket lift. |
| **Status** | **Partial** |

**ROAL files**

| Area | Path |
|------|------|
| Prompt rule | `lib/elevenlabs/agent-prompt.ts` (CORE_BEHAVIOR §7 — one real add-on, yes/no) |
| Operator upsell rules | `restaurant_upsell_rules`, `lib/restaurant-upsell/*`, `RestaurantProfileSettings.tsx`, `buildRestaurantOrderAgentPrompt` |
| Menu modifiers for upsell targets | `lib/menu-editor/modifier-groups.ts`, menu DB via `get-menu` |
| Harness scenarios | `lib/voice-agent/test-harness/scenarios.ts` |
| Marketing copy | `lib/landing/home-capabilities-copy.ts`, blog posts |

**Gaps**

- **Dashboard upsell configuration exists** as operator-managed trigger/offer rules. The agent prompt receives those rules on sync, and the prompt still requires offered items to exist in live `get_menu_items`.
- **Controlled upsell experiment assignment exists** via `upsell_experiment_variant` in ElevenLabs conversation-init dynamic variables. Calls with a stable session/call id are deterministically split into treatment/control; control calls suppress proactive configured upsells while still allowing guest-requested add-ons.
- **Upsell analytics exist** for attach rate, estimated attributed offer revenue, observed ticket lift from completed order line items, and deterministic treatment-vs-control ticket lift.
- **Attach-rate analytics exists** by matching completed order line items against configured trigger/offer text.
- Remaining gap: no operator-facing experiment toggle, statistical confidence interval, or significance testing yet.
- No **POS-combo** sync (excluded with POS anyway).

---

### 7. Analytics (conversion, revenue, operations)

| | |
|---|---|
| **Loman** | Revenue metrics, conversion, earnings, operational dashboards. |
| **Status** | **Partial** |

**ROAL files**

| Area | Path |
|------|------|
| Aggregation | `lib/analytics/aggregate.ts`, `lib/analytics/types.ts`, `lib/analytics/range.ts` |
| Load + pages | `lib/analytics/load-analytics.ts`, `app/dashboard/analytics/page.tsx`, `app/dashboard/restaurants/[id]/analytics/page.tsx` |
| UI | `components/analytics/AnalyticsDashboard.tsx`, `OrdersTrendChart.tsx` |
| Billing usage overlap | `lib/billing/load-billing.ts` |
| Tests / QA | `tests/unit/analytics-aggregate.test.ts`, `scripts/qa-analytics-live.ts` |

**Present (ROAL)**

- Voice order count, draft→completed conversion, est. revenue from menu-priced completed orders, avg prep time, finalized receipts, cancellations, popular items, menu scan health, configured upsell attach rate, attributed upsell revenue, observed ticket lift, deterministic upsell treatment/control lift, **by-location** table at org scope.
- Conversation-init and ElevenLabs post-call webhook events now feed **active call rows**, **call outcomes** (recorded calls, completed order calls, FAQ/no-order calls, abandoned calls), **FAQ/no-order by location**, **peak call hours**, **day/hour rush windows**, and by-location call conversion when production webhooks are configured.

**Gaps**

- Historical charts still focus on **order sessions**; answered vs missed **call** counts require production conversation-init/post-call webhook coverage.
- No **average ticket** trend chart; controlled upsell lift exists as deterministic treatment/control order averages, but no confidence interval or experiment management UI yet.
- No **payment-settled** revenue (intentionally out of scope for this pass).
- No export / scheduled reports.

---

### 8. Peak-call insight (staffing, rush, missed-call economics)

| | |
|---|---|
| **Loman** | Identify **peak call times**; staff smarter; recapture missed-call revenue. |
| **Status** | **Partial** |

**ROAL files**

| Area | Path |
|------|------|
| Marketing / blog narrative | `lib/blog/posts/why-restaurants-miss-calls-dinner-rush.ts`, `rush-hour-staffing-phone-line.ts`, `lib/landing/lost-revenue-calculator.ts` |
| Usage events (could support, unused for peaks) | `usage_events` via `lib/usage/record.ts` — `voice_order` timestamp only, no `call_started` / `call_missed` |
| Post-call peak calls | `agent_call_events.started_at`, `peakCallHoursFromEvents`, `AnalyticsDashboard` “Peak call hours” |

**Gaps**

- **Hour-of-day** cards and day/hour rush-window cards exist from post-call events; no full 7×24 heatmap visualization yet.
- Abandoned calls are tracked from ElevenLabs `call_initiation_failure`; voicemail detection flags can now route calls into staff follow-up. Full carrier-level missed-ring tracking still requires production phone provider events.
- No **concurrent call** peak metric.
- Calculator is **illustrative**, not wired to tenant telemetry.

---

### 9. Handoff (transfer, voicemail, staff callback)

| | |
|---|---|
| **Loman** | Detect intent; transfer to live line, voicemail + transcript, or message staff with context. |
| **Status** | **Partial** |

**ROAL files**

| Area | Path |
|------|------|
| Prompt escalation | `lib/elevenlabs/agent-prompt.ts` (`buildHandoffSection`, `buildCustomerInfoSection`) |
| Escalation contacts on profile | `lib/restaurant-profile/schema.ts` (`escalation_*`), `RestaurantProfileSettings.tsx` |
| Tests | `tests/unit/agent-prompt.test.ts` |
| Content / demos | `lib/blog/posts/when-ai-should-hand-off-to-staff.ts`, `lib/landing/human-handoff-demo.ts` |
| Notifications infra (generic) | `lib/notifications/*`, `app/dashboard/settings/notifications/page.tsx` |
| Staff handoff alert | `lib/notifications/operational-events.ts`, `lib/elevenlabs/post-call-webhook.ts`, migrations `030`–`031` |
| Follow-up inbox | `components/call-history/RestaurantCallHistoryPanel.tsx`, `lib/call-history/build-call-history-rows.ts` |

**Gaps**

- No **`transfer_call` / warm transfer** agent tool; prompt says **callback**, not platform transfer (`agent-prompt.ts`).
- Call History now shows a distinct **voicemail inbox** plus a separate staff follow-up inbox. Voicemail detection uses explicit post-call flags and voicemail-like transcript/intent metadata, shows caller, callback action, summary, and recording links when ElevenLabs supplies a safe audio URL.
- No **ROAL-hosted voicemail recording storage** yet; playback still depends on ElevenLabs-supplied `recording_url` / `audio_url` (prompt references `voicemail_detection` when available — ElevenLabs platform feature, not ROAL-stored).
- Post-call ingestion emits **automatic staff alerts** for voicemail/handoff/callback/manager/escalation flags with caller, session, outcome, reason, and transcript summary; no cart snapshot enrichment yet.
- Harness documents handoff as **prompt-only** (`docs/FLOW_QA_REPORT.md`).

---

### 10. Multi-location (franchise / multi-unit)

| | |
|---|---|
| **Loman** | Shared menu + per-store overrides, local numbers, store hours/holidays, regional routing, rollup analytics. |
| **Status** | **Partial** |

**ROAL files**

| Area | Path |
|------|------|
| Tenant model | `docs/TENANT_SCHEMA.md`, `supabase/migrations/008_organizations_tenant.sql` |
| Location list | `app/dashboard/restaurants/page.tsx`, `CreateRestaurantButton.tsx` |
| Per-location workspace | `lib/restaurant-workspace-nav.ts`, `RestaurantWorkspaceRail.tsx` |
| Org-scoped analytics | `lib/analytics/load-analytics.ts`, `AnalyticsDashboard` “By location” section |
| Menu copy + reusable templates | `MenuCopyFromLocation.tsx`, `copyMenuFromRestaurantAction`, `saveMenuTemplateAction`, `setDefaultMenuTemplateAction`, `applyMenuTemplateAction`, `applyTemplateToInheritedLocationsAction`, `lib/menu-editor/copy-menu.ts` |
| New-location menu inheritance | `POST /api/restaurants`, `applyDefaultOrganizationMenuTemplate` |
| Auth / membership | `lib/auth/context-server.ts`, `lib/auth/roles.ts` |
| Onboarding | `components/onboarding/onboarding-wizard.tsx`, `app/dashboard/onboarding/*` |

**Gaps**

- Menu can now be copied from another restaurant in the same org, or saved as an organization template and applied to another location, replacing the target menu and triggering agent auto-sync.
- A default organization menu template can be applied automatically during new restaurant creation before the dedicated ElevenLabs agent is provisioned, so initial agent sync starts with the brand menu.
- Restaurants now store which organization menu template was inherited and when it was applied, and the menu workspace can re-apply that inherited template when the brand menu changes.
- The menu workspace can now push a shared template to every restaurant that already inherited that template, and each successful target queues a voice-agent menu sync. This is a controlled cascade, not a silent background overwrite.
- Local menu edits, scanner commits, and full menu clears on inherited locations now increment an override counter and timestamp. Brand-wide template pushes replace unchanged inherited locations; customized locations receive only missing brand categories/items, preserving existing local item prices, availability, descriptions, modifiers, and local-only items.
- Field-level inherited diff calculation now exists for customized locations. It reports missing categories/items, local-only items, and changed item fields (`description`, `price`, `availability`, `modifiers`) when an inherited template push uses add-missing mode.
- Remaining gap: no operator UI to approve individual field updates inside an existing customized item and no regional routing.
- **Phone numbers / ElevenLabs agent** are per-restaurant connect flow (`VoiceAgentPanel`) — no **centralized number routing** across stores in-app.
- No **region-based routing** rules.
- No **franchise admin** role distinct from org owner (standard owner/admin/member only).
- Holidays exist per restaurant (`hours` exceptions) but not **bulk apply across locations**.

---

## Excluded by design (this pass)

| Loman capability | ROAL note |
|------------------|-----------|
| POS order/reservation sync | No Toast/Square/Clover/SpotOn integrations in repo |
| Phone payment capture | Prompt explicitly avoids collecting card numbers; no payment tools |
| Reservation booking + POS | Not present |

Reference exclusions in: `lib/elevenlabs/agent-prompt.ts` (payments copy), `lib/landing/home-capabilities-copy.ts` (scope statement), `docs/PRODUCT_LANGUAGE_SAFETY_AUDIT.md`.

---

## Suggested priority (passes 02–40 hint)

1. **Live calls + outcomes** — active-call and post-call ingestion exist; next: live transcript streaming/audio monitor; fix `CallStatusStrip` semantics.
2. **Peak-call analytics** — production conversation-init/post-call coverage + hourly aggregation UI.
3. **Handoff v2** — staff notifications with draft cart summary; optional transfer when EL supports; ROAL-hosted voicemail inbox if needed.
4. **Command center UX** — unify orders, calls, outcomes, recordings, and order-status lookups on `agent/page.tsx` or dedicated `/calls`.
5. **Multi-location** — field-level diff visibility exists for customized inherited menus; add operator approval for individual inherited field updates and regional routing.
6. **Upsell lift metrics** — attach-rate, attributed revenue, observed lift, and deterministic treatment/control lift exist; add confidence intervals and an operator-facing experiment control.

---

## Related internal docs

- `docs/ELEVENLABS.md` — voice stack  
- `docs/TENANT_SCHEMA.md` — org / locations  
- `docs/FLOW_QA_REPORT.md` — harness matrix (handoff prompt-only)  
- `docs/enterprise-build-prompts.md` — onboarding progress (planned)

---

*Pass 01/40 — documentation only; no application code changes.*
