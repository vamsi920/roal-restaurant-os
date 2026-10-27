# Magic onboarding — "paste your link, talk to your phone host"

The homepage, `/try`, and the first-run dashboard all share one flow: a restaurant owner pastes
their website (or a Google Maps link, or "Name, City"), ROAL builds an AI phone host from public
pages, and they call it from the browser in about a minute. No sign-up until they want to keep it.

## Flow

```
input ──POST /api/try──▶ agent_trials row + signed cookie (roal_trial)
      ──POST /api/try/[id]/listing──▶ profile + hours + seed FAQs
      ──POST /api/try/[id]/menu─────▶ website menu (Gemini) | menu URL | photo | sample
      ──POST /api/try/[id]/agent────▶ prompt + greeting composed, status = ready
      ──POST /api/try/[id]/call─────▶ ElevenLabs signed URL + conversation overrides
      ──POST /api/try/[id]/transcript▶ saves turns, auto-ticks the scorecard
      ──PATCH /api/try/[id]/persona─▶ host name, voice, restaurant name, knowledge edits
sign up ──▶ /dashboard/onboarding ──claimTrialAction──▶ org + restaurant + profile + hours
          + menu + knowledge + persona + dedicated ElevenLabs agent (existing provisioning)
```

Key files:

| Area | Path |
|------|------|
| Input parsing | `lib/trial/input.ts` |
| Listing resolution (website → Gemini → Places enrichment; heuristic JSON-LD fallback when Gemini is unavailable) | `lib/trial/pipeline.ts`, `lib/trial/website-profile.ts`, `lib/trial/heuristic-profile.ts` |
| Menu import | `lib/restaurant-lookup/import-website-menu.ts`, `lib/trial/sample-menu.ts` |
| Trial prompt (tool-free, menu inline) | `lib/trial/prompt.ts` |
| Shared trial agent (created once, stored in `internal_config.elevenlabs_trial_agent_id`) | `lib/trial/elevenlabs.ts` |
| Browser call UI (`@elevenlabs/client`, live transcript, orb) | `components/try/trial-call.tsx` |
| Builder UI | `components/try/trial-builder.tsx`, `components/try/trial.css` |
| Scorecard (auto-ticks from transcript) | `lib/trial/scorecard.ts`, `components/try/trial-scorecard.tsx` |
| Voice picker with previews | `components/try/trial-voice-picker.tsx`, `app/api/try/voices/route.ts` |
| Claim | `lib/trial/claim.ts`, `claimTrialAction` in `app/dashboard/onboarding/actions.ts` |
| Storage | Firestore collections `agent_trials` and `restaurant_knowledge_suggestions` (defaults in `lib/db/schema.ts`); persona fields live on `restaurant_profiles` |

## Security

* `agent_trials` is only read and written by the server (Admin SDK via `getDb()`); Firestore rules deny all client access, so browsers can never list or read trials directly.
* Each trial has a random token; the cookie carries `id.token`, the row stores the SHA-256 hash.
* Route handlers check the cookie against the path id before touching a trial.
* Rate limits: 8 trial starts / 10 min / IP (per server process), 12 calls per trial.
* Spend caps: `TRIAL_DAILY_CALL_CAP` demo calls per rolling 24h across everyone (default 200), and each demo call is capped at 5 minutes on the shared agent.
* The trial agent has no tools, so a demo call can never write to a real restaurant.

## Persona

Voice and host name chosen during the trial are stored on `restaurant_profiles`
(`agent_display_name`, `agent_voice_id`, `agent_voice_label`, `agent_greeting`) and applied to the
dedicated agent on every sync (`tts.voice_id`, first message).

## Unanswered-question inbox

After each real call, `persistElevenLabsPostCallEvent` runs `mineKnowledgeSuggestionsFromTranscript`
(Gemini) and stores questions the host could not answer in `restaurant_knowledge_suggestions`.
Owners accept them into `restaurant_knowledge_entries` from the Phone host page.

## Degraded modes

* No `GEMINI_API_KEY` or billing exhausted: listing falls back to JSON-LD / meta heuristics; menu
  falls back to a sample menu (owner can paste a menu link or upload a photo after Gemini returns).
* No `GOOGLE_PLACES_API_KEY`: Google Maps links and "Name, City" inputs are refused with a hint to
  paste the website instead.
* No `ELEVENLABS_API_KEY`: `/api/try/[id]/call` returns 503.
