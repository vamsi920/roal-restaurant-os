export function SolutionChatVisual() {
  return (
    <svg viewBox="0 0 140 100" className="landing-beat-visual__svg" aria-hidden>
      <path
        d="M16 20h68c8 0 14 6 14 14v28c0 8-6 14-14 14H44L24 88V62c-8 0-14-6-14-14V34c0-8 6-14 14-14z"
        className="landing-beat-visual__fill"
      />
      <path d="M30 38h48M30 50h36" className="landing-beat-visual__stroke-thin" strokeLinecap="round" />
      <path
        d="M56 44h52c8 0 14 6 14 14v22c0 8-6 14-14 14H78l-14 18V80c-8 0-14-6-14-14V58c0-8 6-14 14-14z"
        className="landing-beat-visual__accent-bubble"
      />
      <path d="M72 58h32M72 68h24" className="landing-beat-visual__stroke-thin" strokeLinecap="round" />
      <circle cx="48" cy="44" r="3" className="landing-beat-visual__ink-dot" />
      <circle cx="58" cy="44" r="3" className="landing-beat-visual__ink-dot" />
      <circle cx="68" cy="44" r="3" className="landing-beat-visual__ink-dot" />
    </svg>
  );
}

export function SolutionMenuVisual() {
  return (
    <svg viewBox="0 0 140 100" className="landing-beat-visual__svg" aria-hidden>
      <rect x="34" y="12" width="72" height="76" rx="6" className="landing-beat-visual__fill" />
      <path d="M34 24h72" className="landing-beat-visual__stroke-thin" strokeLinecap="round" />
      <path d="M46 36h52M46 48h40M46 60h44M46 72h32" className="landing-beat-visual__stroke-thin" strokeLinecap="round" />
      <rect x="46" y="36" width="20" height="11" rx="2" className="landing-beat-visual__accent-chip" />
      <path d="M98 52h10M103 47v10" className="landing-beat-visual__stroke-thin" strokeLinecap="round" />
    </svg>
  );
}

export function SolutionTicketVisual() {
  return (
    <svg viewBox="0 0 140 100" className="landing-beat-visual__svg" aria-hidden>
      <path
        d="M40 16h60c8 0 14 6 14 14v52c0 8-6 14-14 14H40c-8 0-14-6-14-14V30c0-8 6-14 14-14z"
        className="landing-beat-visual__fill"
      />
      <path d="M52 36h36M52 48h28M52 60h32" className="landing-beat-visual__stroke-thin" strokeLinecap="round" />
      <rect x="72" y="24" width="34" height="16" rx="8" className="landing-beat-visual__accent-chip" />
      <path
        d="M88 72l10 10 18-22"
        className="landing-beat-visual__accent-check"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34 24c3 0 6-3 6-6M100 18c3 0 6 3 6 6"
        className="landing-beat-visual__stroke-thin"
        strokeLinecap="round"
      />
    </svg>
  );
}
