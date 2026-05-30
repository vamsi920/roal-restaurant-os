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
| Voice tools (menu, draft sync, finalize) | `supabase/functions/get-menu/index.ts`, `supabase/functions/sync-draft-order/index.ts`, `supabase/functions/finalize-order/index.ts` |
| Tool schemas / auth | `supabase/functions/_shared/agent-tool-schemas.ts`, `lib/agent-tools/*` |
| Agent behavior | `lib/elevenlabs/agent-prompt.ts` |
| ElevenLabs wiring | `lib/sync-elevenlabs-roal-tools.ts`, `app/api/integrations/elevenlabs/sync-roal-tools/route.ts`, `app/dashboard/restaurants/[id]/voice-agent-actions.ts`, `lib/voice-agent/control-center.ts` |
| Call → restaurant binding | `app/api/integrations/elevenlabs/conversation-init/route.ts`, `lib/elevenlabs/conversation-init.ts`, `lib/elevenlabs/phone-personalization.ts` |
| KDS / live orders UI | `app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx`, `KitchenOrderCard.tsx`, `useOrderStatusActions.ts` |
| Order model | `lib/order-status.ts`, `lib/orders/*`, migrations `draft_orders`, `phone_order_receipts` |
| Usage metering | `supabase/functions/_shared/record-usage.ts`, `lib/usage/record.ts` |
| Tests | `lib/voice-agent/test-harness/*`, `tests/integration/api-elevenlabs-*`, `tests/unit/voice-agent-harness.test.ts` |

**Gaps**

- **Delivery** is profile-flagged (`allows_delivery` in `lib/restaurant-profile/schema.ts`, prompt in `agent-prompt.ts`) but there is no delivery address capture, routing, or fulfillment workflow comparable to Loman’s delivery + POS ticket.
- **Concurrent call** capacity is delegated to ElevenLabs; ROAL does not surface concurrency or queue depth in-product.
- **Order status by phone** (“where’s my order?”) is not a first-class agent capability or dashboard view.
- **Reservations** (Loman highlights them) — **Gap** (no reservation tools or UI).

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
| Profile (address, phone, cuisine, closure) | `lib/restaurant-profile/schema.ts`, `helpers.ts`, `app/dashboard/restaurants/[id]/RestaurantProfileSettings.tsx` |
| Weekly hours + exceptions | `lib/restaurant-hours/core.ts`, `app/dashboard/restaurants/[id]/RestaurantHoursSettings.tsx`, `hours-actions.ts` |
| Marketing FAQ (not operator KB) | `lib/landing/launch-faq.ts`, `components/landing/public/*` |

**Gaps**

- No **structured FAQ / knowledge base** table or editor (only profile fields + menu JSON).
- No **wait-time** or **directions** tools beyond static profile address and prep minutes in profile.
- **Multi-language** (Loman FAQ) — **Gap** in product (English-first prompt).
- **Repeat caller recognition** — **Gap** (no CRM / caller ID persistence in app DB).

---

### 3. Live calls (see active calls, listen/read along)

| | |
|---|---|
| **Loman** | Command center shows **live calls**, transcripts, and call activity in one place. |
| **Status** | **Gap** (UI mislabel / draft proxy only) |

**ROAL files**

| Area | Path |
|------|------|
| “Call live” strip on KDS | `app/dashboard/restaurants/[id]/CallStatusStrip.tsx` — driven by `liveCount={liveCarts.length}` in `LiveOrdersPanel.tsx` (**active draft carts**, not telephony sessions) |
| Voice agent ops (connect/sync, not call feed) | `app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx`, `agent/page.tsx` |
| Illustrative transcript (marketing) | `components/landing/chapters/conversation-transcript.tsx`, `lib/landing/agent-conversation-demo.ts` |
| Conversation bootstrap | `lib/elevenlabs/conversation-init.ts` |

**Gaps**

- No **ingestion of ElevenLabs conversation events** (start/end, transcript chunks) into Supabase.
- No **live call list**, **recording playback**, or **in-call transcript** in dashboard.
- `CallStatusStrip` copy implies phone activity; implementation tracks **in-progress draft orders** — parity risk vs Loman “live calls.”

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

- No **call-level outcome** taxonomy (completed order, abandoned cart, FAQ-only, handoff, wrong number) stored per `session_id` / conversation id.
- No **transcript** or **call recording** linked to orders.
- **Finalize vs KDS complete** are related but not exposed as a single “call outcome” timeline in UI.

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

**Gaps**

- Menu **availability** updates apply on next `get_menu_items` call; **prompt text** (counts, policies) may lag until **ElevenLabs resync** (`sync-roal-tools`, `VoiceAgentPanel` resync).
- No **single “publish to voice”** control that guarantees prompt + tools + menu in one action (operators must understand sync vs live tool fetch).
- No **shared menu template** across locations (see multi-location).

---

### 6. Upsell (add-ons, combos, ticket lift)

| | |
|---|---|
| **Loman** | Smart prompts for add-ons and combos; measurable ticket lift. |
| **Status** | **Partial** (prompt-only) |

**ROAL files**

| Area | Path |
|------|------|
| Prompt rule | `lib/elevenlabs/agent-prompt.ts` (CORE_BEHAVIOR §7 — one real add-on, yes/no) |
| Menu modifiers for upsell targets | `lib/menu-editor/modifier-groups.ts`, menu DB via `get-menu` |
| Harness scenarios | `lib/voice-agent/test-harness/scenarios.ts` |
| Marketing copy | `lib/landing/home-capabilities-copy.ts`, blog posts |

**Gaps**

- No **dashboard upsell configuration** (featured add-ons, combo rules, caps).
- No **analytics**: attach rate, revenue from upsell, A/B on prompts.
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

- Voice order count, draft→completed conversion, est. revenue from menu-priced completed orders, avg prep time, finalized receipts, cancellations, popular items, menu scan health, **by-location** table at org scope.

**Gaps**

- Chart title says **“Calls & orders”** but series is **daily `voice_order` usage + kitchen statuses** — not answered vs missed **call** counts.
- No **average ticket** trend or **upsell lift** metrics (Loman claims % lift).
- No **payment-settled** revenue (intentionally out of scope for this pass).
- No export / scheduled reports.

---

### 8. Peak-call insight (staffing, rush, missed-call economics)

| | |
|---|---|
| **Loman** | Identify **peak call times**; staff smarter; recapture missed-call revenue. |
| **Status** | **Gap** (content only) |

**ROAL files**

| Area | Path |
|------|------|
| Marketing / blog narrative | `lib/blog/posts/why-restaurants-miss-calls-dinner-rush.ts`, `rush-hour-staffing-phone-line.ts`, `lib/landing/lost-revenue-calculator.ts` |
| Usage events (could support, unused for peaks) | `usage_events` via `lib/usage/record.ts` — `voice_order` timestamp only, no `call_started` / `call_missed` |

**Gaps**

- No **hour-of-day / day-of-week** heatmap.
- No **missed call** or **abandoned call** tracking.
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

**Gaps**

- No **`transfer_call` / warm transfer** agent tool; prompt says **callback**, not platform transfer (`agent-prompt.ts`).
- No **voicemail inbox** with transcript in dashboard (prompt references `voicemail_detection` when available — ElevenLabs platform feature, not ROAL-stored).
- No **automatic staff alert** on handoff with cart snapshot (notifications not tied to escalation events).
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
| Auth / membership | `lib/auth/context-server.ts`, `lib/auth/roles.ts` |
| Onboarding | `components/onboarding/onboarding-wizard.tsx`, `app/dashboard/onboarding/*` |

**Gaps**

- **Per-location menu** only — no **shared menu + override** model.
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

1. **Live calls + outcomes** — webhook/pipeline from ElevenLabs → `call_sessions` + transcript snippets; fix `CallStatusStrip` semantics.  
2. **Peak-call analytics** — `call_started` / `call_ended` usage events + hourly aggregation UI.  
3. **Handoff v2** — staff notifications with draft cart summary; optional transfer when EL supports.  
4. **Command center UX** — unify orders, calls, outcomes on `agent/page.tsx` or dedicated `/calls`.  
5. **Multi-location** — shared menu template + per-store overrides; rollup already started in analytics.  
6. **Upsell config + metrics** — dashboard rules + attach-rate in `lib/analytics`.  

---

## Related internal docs

- `docs/ELEVENLABS.md` — voice stack  
- `docs/TENANT_SCHEMA.md` — org / locations  
- `docs/FLOW_QA_REPORT.md` — harness matrix (handoff prompt-only)  
- `docs/enterprise-build-prompts.md` — onboarding progress (planned)

---

*Pass 01/40 — documentation only; no application code changes.*
