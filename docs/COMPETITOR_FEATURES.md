# Competitor features — what we borrowed (Oct 2026)

Internal only. Never name these companies in public copy.

| Competitor | Signature feature | What ROAL shipped |
|---|---|---|
| heytruffle / Loman / Kea | Build a demo from your link and test-call it before signing up | Homepage + `/try`: paste website / Maps link → host builds itself → in-browser call → claim (`docs/MAGIC_ONBOARDING.md`) |
| PolyAI | In-browser microphone test call inside the product | `TrialCall` on the Phone host page and Go-live checklist (`components/try/trial-call.tsx`) |
| Popmenu | Owner picks the voice by hearing options | Voice picker with ElevenLabs previews, host name, persona saved on the profile and applied on sync |
| Maple / heytruffle | Guided trial worksheet and owner sign-off before going live | Scorecard that auto-ticks from the transcript (`lib/trial/scorecard.ts`), stored on the profile as `trial_scorecard` |
| Slang.ai / Goodcall | Agent that improves from calls | "Questions your host couldn't answer" inbox mined from post-call transcripts → one-click FAQ entries (`restaurant_knowledge_suggestions`) |

## Observed pricing (self-reported, unverified)
Loman $199–$529/location/mo · Slang $399–$599 · PolyAI $299–$399 · heytruffle $299–$499 · Goodcall $79–$299 · Maple $150–$350 · Kea ~$450. ROAL: $0.90 per completed order, no monthly fee — keep this the headline.

## Not copied (and why)
* POS integrations, phone card capture: out of scope by design.
* Missed-call text-back, daily SMS digest: needs an SMS provider; revisit when Twilio is wired.
* Persistent public demo number: needs a dedicated ElevenLabs phone number; cheap follow-up.
