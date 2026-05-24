# Manual E2E smoke checklist

**Time:** ~25–40 min · **Env:** staging or local with `.env` filled, migrations `001`–`024` applied (`supabase db push`).

**Pass criteria:** each step completes without 5xx; UI shows expected state; no secrets in browser network tab (only anon key + session).

---

## 0. Preflight

- [ ] `npm run dev` or staging URL loads
- [ ] `GET /api/health` → `status` is `healthy` or `degraded`, `request_id` present, no API keys in JSON
- [ ] Supabase Auth: Email provider on; redirect URL includes `/auth/callback`

---

## 0. Automated Playwright smoke

With dev server running (`npm run dev`; if chunk 404s: `rm -rf .next && npm run dev`):

### Auth only (`auth-smoke`)

```bash
npm run auth-smoke
```

Login/signup render, field types, fake submit (`smoke-test@example.invalid` only). No real credentials.

### Full E2E smoke (`e2e-smoke`) — prompt 57

```bash
npm run e2e-smoke
```

| Check | Credentials | Paid APIs |
|-------|-------------|-----------|
| Login/signup render + fake submit | Fake email only | Supabase auth attempt only |
| `/dashboard` → `/login?next=` | None | None |
| Dashboard overview | Optional `E2E_EMAIL` + `E2E_PASSWORD` | None |
| KDS restaurant page, orders panel, voice harness | Same optional env | None |
| Menu scanner → review UI | Same; **mocked** `POST /api/scanner/extract` | **No Gemini** |

Optional env (local only — **never commit**):

| Variable | Purpose |
|----------|---------|
| `E2E_EMAIL` / `E2E_PASSWORD` | Real test user for signed-in KDS checks |
| `E2E_RESTAURANT_ID` | Skip restaurant list; open this KDS id |
| `E2E_BASE_URL` or `SMOKE_BASE_URL` | Default `http://localhost:3000` |
| `E2E_SKIP_AUTH=1` | Skip login/signup UI (faster re-run) |
| `E2E_SKIP_SCANNER=1` | Skip mocked scanner step |

Without `E2E_EMAIL` / `E2E_PASSWORD`, authenticated steps are reported as **skipped** (exit 0).

## 1. Auth

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | `/signup` → create account | Lands on `/dashboard` or onboarding |
| 1.2 | Sign out → `/login` → same credentials | Session restored; dashboard loads |
| 1.3 | Open `/dashboard/admin` as **member** (if test user) | Redirect to `/dashboard` (no admin console) |

---

## 2. Org & restaurant

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | `/dashboard/onboarding` — create org (if new) | Org + owner membership |
| 2.2 | `/dashboard/restaurants` → **Create restaurant** | New card; opens KDS URL |
| 2.3 | KDS `/dashboard/restaurants/[id]` loads | Menu sidebar, scanner, orders, voice panels |

---

## 3. Profile & hours

On restaurant KDS page:

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | **Restaurant profile** — set name, tax %, service fee → save | Success; values persist after refresh |
| 3.2 | **Hours** — set weekly hours → save | Saved; voice prompt context uses hours (optional: check agent preview) |

---

## 4. Menu scan → review → commit

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | **Menu scanner** — upload menu image | Extract completes; **Review** UI with categories/items |
| 4.2 | Edit a item name/price in review → **Commit to menu** | Status **Synced**; live menu sidebar populates |
| 4.3 | **Import history** (if shown) | Row for this import with success status |

---

## 5. Menu editor

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | `/dashboard/restaurants/[id]/menu` | Editor loads committed items |
| 5.2 | Add or edit item / modifier group → save | Change visible on KDS menu sidebar (refresh or Realtime) |

---

## 6. Simulated voice order

On KDS, **Voice agent test harness** (dry run **off** for live DB writes, or **on** to validate tools only):

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | Run scenario **happy_path** (or: Get menu → Sync draft → Finalize) | Steps green; `session_id` shown |
| 6.2 | **Phone orders** panel | Live cart appears under draft/active |
| 6.3 | After finalize | Order in kitchen queue as **New** (or receipt + queue per config) |

*Requires `AGENT_TOOL_SIGNING_SECRET` (+ Edge functions deployed) for non–dry-run.*

---

## 7. KDS order status

| Step | Action | Expected |
|------|--------|----------|
| 7.1 | **Accept** order | Status → Accepted |
| 7.2 | **Start** → **Mark ready** → **Complete** | Progresses; completed tab/history updates |
| 7.3 | (Optional) **Cancel** on second test order | Canceled; removed from active queue |

---

## 8. Cross-cutting dashboards

| Area | Route | Check |
|------|-------|--------|
| Analytics | `/dashboard/analytics` | Range picker; KPIs or empty state (no crash) |
| Billing | `/dashboard/billing` | Plan + usage; gate notice if over limit |
| Notifications | `/dashboard/settings/notifications` | Settings save; **Recent deliveries** after order complete (dev console) |
| Admin ops | `/dashboard/admin` (org **admin**) | Health cards, restaurant sync table, recent errors |
| Health (public) | `/api/health` | JSON ok; env flags booleans only |

---

## 9. Sign-off

- [ ] No console errors on KDS during Realtime (or polling fallback banner only)
- [ ] Second browser tab: menu or order update visible without full reload
- [ ] `npm test` green on release commit

**Automated subset:** `SMOKE_BASE_URL=https://your-app npm run smoke` (health + public pages only) · `npm run e2e-smoke` (Playwright; optional signed-in env).

**Related:** [DEPLOYMENT.md](./DEPLOYMENT.md) · [TESTING.md](./TESTING.md)
