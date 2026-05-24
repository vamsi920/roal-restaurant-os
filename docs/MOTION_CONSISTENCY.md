# Motion consistency (prompt 83)

Public surfaces use **light CSS motion** only—no scroll-choreography or GSAP on launch routes.

## Patterns

| Pattern | Where | Reduced motion |
|---------|--------|----------------|
| **View reveal** | `.public-reveal`, `.public-reveal-item` in hero, AEO, CTA band, FAQ, metrics | `animation: none` |
| **Glass hover** | `.glass-card`, `.home-glass-panel`, blog cards, trust tiles | `transform: none`; color/border only |
| **Button lift** | `.public-btn-primary`, nav CTA, home buttons | `transform: none` (existing + consolidated) |

## Implementation

- Tokens: `lib/landing/public-motion.ts`
- Styles: `app/public-theme.css` block “Motion: subtle reveal + glass hover”
- Homepage how-it-works scroll steps: unchanged (`home-how-flow` disables motion when `prefers-reduced-motion: reduce`)

## Intentionally not animated

- Dashboard / KDS
- Poster `landing-poster-flow` scroll-driven enters (orphan; disabled under reduce)
- Blog motif ring/scribble pulses (disabled in `blog-theme.css`)
- FAQ `<details>` open/close (native, no height animation)

## Optional framer

`components/landing/motion/use-landing-motion.ts` remains for demo transcript and future client-only blocks—not wired globally.
