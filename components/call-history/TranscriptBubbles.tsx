import type { CallHistoryTranscriptLine } from "@/lib/call-history/types";
import { cn } from "@/lib/cn";

/**
 * Call transcript as a chat: the host on the left, the caller on the right,
 * system/tool lines as small centered notes.
 */
export function TranscriptBubbles({
  lines,
  hostName = "Host",
  className,
}: {
  lines: CallHistoryTranscriptLine[];
  hostName?: string;
  className?: string;
}) {
  if (lines.length === 0) return null;
  return (
    <ol className={cn("flex flex-col gap-2", className)} aria-label="Call transcript">
      {lines.map((line, idx) => {
        if (line.speaker === "System" || line.speaker === "Tool") {
          return (
            <li key={idx} className="self-center px-2 text-center text-[11.5px] text-subtle [overflow-wrap:anywhere]">
              {line.text}
            </li>
          );
        }
        const isHost = line.speaker === "Agent";
        return (
          <li
            key={idx}
            className={cn("flex max-w-[85%] flex-col", isHost ? "items-start self-start" : "items-end self-end")}
          >
            <span className="mb-0.5 px-1 text-[11px] font-medium text-subtle">
              {isHost ? hostName : "Caller"}
            </span>
            <p
              className={cn(
                "rounded-[14px] px-3 py-2 text-[13.5px] leading-snug [overflow-wrap:anywhere]",
                isHost
                  ? "rounded-tl-[4px] border border-line bg-elev text-ink"
                  : "rounded-tr-[4px] bg-ink text-white"
              )}
            >
              {line.text}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
