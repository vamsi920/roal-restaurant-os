function PhoneGlyph() {
  return (
    <svg className="home-how-roal__glyph" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 4h8l2 4v12H6V8l2-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HowFlowConnectVisual() {
  return (
    <div className="home-how-visual home-how-visual--connect">
      <div className="home-how-roal__route" aria-hidden>
        <div className="home-how-roal__node">
          <PhoneGlyph />
          <span>Your line</span>
        </div>
        <span className="home-how-roal__connector" />
        <div className="home-how-roal__node home-how-roal__node--roal">
          <span className="home-how-roal__pulse" aria-hidden />
          <span className="home-how-roal__mark">ROAL</span>
          <span>Answers calls</span>
        </div>
      </div>
      <p className="home-how-connect__hint">Forward pickup calls when you are ready.</p>
    </div>
  );
}
