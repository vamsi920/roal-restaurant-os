import type { TranscriptLine } from "@/lib/landing/agent-conversation-demo";

type Props = {
  greeting: TranscriptLine[];
};

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

export function HowFlowRoalVisual({ greeting }: Props) {
  const line = greeting[0];

  return (
    <div className="home-how-visual home-how-visual--roal">
      <div className="home-how-roal__route" aria-hidden>
        <div className="home-how-roal__node">
          <PhoneGlyph />
          <span>Your line</span>
        </div>
        <span className="home-how-roal__connector" />
        <div className="home-how-roal__node home-how-roal__node--roal">
          <span className="home-how-roal__pulse" aria-hidden />
          <span className="home-how-roal__mark">ROAL</span>
          <span>Live menu</span>
        </div>
      </div>
      {line ? (
        <div className="home-how-roal__bubble">
          <span className="home-how-call__speaker">ROAL</span>
          <span className="home-how-call__text">{line.text}</span>
        </div>
      ) : null}
    </div>
  );
}
