export function StepMenuVisual() {
  return (
    <svg viewBox="0 0 120 80" className="landing-beat-visual__svg" aria-hidden>
      <rect x="28" y="10" width="64" height="60" rx="6" className="landing-beat-visual__fill" />
      <path d="M40 26h40M40 38h32M40 50h36" className="landing-beat-visual__stroke-thin" strokeLinecap="round" />
      <rect x="40" y="26" width="18" height="10" rx="2" className="landing-beat-visual__accent-chip" />
    </svg>
  );
}

export function StepPhoneVisual() {
  return (
    <svg viewBox="0 0 120 80" className="landing-beat-visual__svg" aria-hidden>
      <rect x="42" y="8" width="36" height="64" rx="8" className="landing-beat-visual__fill" />
      <circle cx="60" cy="62" r="4" className="landing-beat-visual__accent-chip" />
      <path
        d="M78 28c12 0 22 10 22 22"
        className="landing-beat-visual__accent-ring"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M82 24c16 0 28 12 28 28"
        className="landing-beat-visual__accent-ring landing-beat-visual__accent-ring--2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StepOrdersVisual() {
  return (
    <svg viewBox="0 0 120 80" className="landing-beat-visual__svg" aria-hidden>
      <rect x="18" y="14" width="84" height="52" rx="6" className="landing-beat-visual__fill" />
      <path d="M30 30h60M30 42h44M30 54h52" className="landing-beat-visual__stroke-thin" strokeLinecap="round" />
      <rect x="72" y="22" width="22" height="12" rx="6" className="landing-beat-visual__accent-chip" />
    </svg>
  );
}
