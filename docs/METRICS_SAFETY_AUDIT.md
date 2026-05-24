# Metrics copy safety audit (prompt 79)

Last review: launch public surfaces (`/`, `/pricing`, marketing previews, demo data).

## Rules

1. **No fabricated aggregates** — Do not show invented totals (e.g. “847 orders recovered”) unless labeled example/pilot and tied to a review process.
2. **Illustrative math** — Dollar and percent worksheets use round example inputs; footnotes use `METRICS_EXAMPLE_DISCLAIMER` from `lib/landing/metrics-safety.ts`.
3. **Pilot metrics** — Homepage strip lists **categories we track**, not customer-specific results. Footnote uses `METRICS_PILOT_DISCLAIMER`.
4. **No guaranteed savings** — Compare tables and staff models say “illustrative” / “not guaranteed dollar savings.”
5. **Demo UI** — Menu scan, KDS, conversation, and pricing bars label **sample / demo / illustrative** data.

## Audited surfaces

| Surface | Status | Notes |
|---------|--------|--------|
| Homepage metrics strip | OK | Example pilot metrics; no numeric pills |
| Homepage savings card | OK | 8 / 50% / $35 / ~$140 labeled example |
| Homepage hero | OK | Qualifier: results depend on volume; no guaranteed averages |
| Pricing success visual | OK | 42 / 11 counts marked example; SAMPLE invoice |
| Pricing compare | OK | Illustrative comparison disclaimer |
| Product proof / how-it-works | OK | Illustrative demo / sample scan labels |
| Social proof demo (unused on `/`) | OK | No fake %; order accuracy = pilot review |
| Blog posts | OK | Illustrative math sections already disclaim guarantees |
| About limits | OK | Calls out fabricated ROI / national averages |

## Shared copy module

`lib/landing/metrics-safety.ts` — import disclaimers instead of duplicating strings.

## Not in scope

- **$0.90/order** — Published pilot anchor; FAQ states terms vary by volume.
- **Headline claims** — See `docs/PRODUCT_LANGUAGE_SAFETY_AUDIT.md`; hero uses rush-volume framing + qualifier, not “never miss.”
- **Dashboard analytics** — Real tenant data when logged in; not public marketing.
