import type { TranscriptLine } from "@/lib/landing/agent-conversation-demo";

type Props = {
  lines: TranscriptLine[];
};

export function HowFlowCallVisual({ lines }: Props) {
  return (
    <div className="home-how-visual home-how-visual--call">
      <ul className="home-how-call__lines">
        {lines.map((line) => (
          <li
            key={line.id}
            className={
              line.speaker === "agent" ? "home-how-call__line--agent" : "home-how-call__line--guest"
            }
          >
            <span className="home-how-call__speaker">
              {line.speaker === "agent" ? "ROAL" : "Guest"}
            </span>
            <span className="home-how-call__text">{line.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
