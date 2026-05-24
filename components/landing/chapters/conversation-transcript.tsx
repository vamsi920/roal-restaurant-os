"use client";

import { motion, useInView } from "framer-motion";
import type { CSSProperties, RefObject } from "react";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  AGENT_CONVERSATION_DEMO,
  type TranscriptLine,
  type TranscriptSpeaker,
} from "@/lib/landing/agent-conversation-demo";
import { LANDING_EASE_OUT, LANDING_MOTION } from "@/lib/landing/motion-config";
import { useLandingReducedMotion } from "../motion/use-landing-motion";

const WAVE_HEIGHTS = [0.4, 0.7, 1, 0.55, 0.85, 0.45, 0.65, 0.5, 0.75, 0.6] as const;

type TurnSpeaker = Extract<TranscriptSpeaker, "guest" | "agent">;

function turnLabel(speaker: TurnSpeaker | null) {
  if (speaker === "guest") return "Caller speaking";
  if (speaker === "agent") return "ROAL agent speaking";
  return "Call connected";
}

function ConversationWaveform({
  live,
  turn,
  reduced,
}: {
  live: boolean;
  turn: TurnSpeaker | null;
  reduced: boolean;
}) {
  return (
      <motion.div
      className={cn(
        "conversation-wave border-b border-line bg-elev/40 px-4 py-2",
        live && !reduced && "conversation-wave--live",
        turn === "guest" && "conversation-wave--guest",
        turn === "agent" && "conversation-wave--agent"
      )}
      aria-hidden
      initial={false}
      animate={reduced || !live ? undefined : { opacity: [0.92, 1, 0.92] }}
      transition={
        reduced || !live
          ? undefined
          : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <motion.div className="flex h-6 items-end justify-center gap-[3px]" role="presentation">
        {WAVE_HEIGHTS.map((h, i) => (
          <span
            key={i}
            className="conversation-wave-bar w-[3px] rounded-full"
            style={
              reduced
                ? { height: `${h * 100}%` }
                : ({ "--wave-base": h } as CSSProperties)
            }
          />
        ))}
      </motion.div>
    </motion.div>
  );
}

function CallHeader({ live, turn }: { live: boolean; turn: TurnSpeaker | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--public-accent-lavender)/0.15)]",
            live && "conversation-header-icon--live"
          )}
        >
          <WaveIcon />
          {live ? <span className="pulse-dot absolute -right-0.5 -top-0.5" /> : null}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {AGENT_CONVERSATION_DEMO.restaurant}
          </p>
          <p className="text-[11px] text-muted">{AGENT_CONVERSATION_DEMO.scenario}</p>
          <p
            className={cn(
              "mt-0.5 text-[11px] font-medium text-accent transition-opacity",
              live ? "opacity-100" : "opacity-70"
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {turnLabel(turn)}
          </p>
        </div>
      </div>
      <span className="public-demo-transcript-chip shrink-0 text-[11px] normal-case">
        AI voice · disclosed
      </span>
    </div>
  );
}

function TranscriptBubble({
  line,
  active,
  reduced,
  scrollRoot,
  onEnter,
}: {
  line: TranscriptLine;
  active: boolean;
  reduced: boolean;
  scrollRoot: RefObject<HTMLElement | null>;
  onEnter: (line: TranscriptLine) => void;
}) {
  if (line.speaker === "system") {
    return (
      <motion.li
        className="flex justify-center py-1"
        initial={reduced ? false : { opacity: 0, y: 8 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ root: scrollRoot, once: true, amount: 0.85 }}
        transition={{ duration: 0.4, ease: LANDING_EASE_OUT }}
        onViewportEnter={() => onEnter(line)}
      >
        <p
          className={cn(
            "max-w-[95%] rounded-full px-3 py-1.5 text-center text-[11px] font-medium leading-snug sm:text-xs",
            line.beat === "disclosure"
              ? "border border-[rgb(var(--public-accent-lavender)/0.35)] bg-[rgb(var(--public-accent-lavender)/0.12)] text-ink"
              : "border border-line bg-elev text-subtle"
          )}
        >
          {line.text}
        </p>
      </motion.li>
    );
  }

  const isAgent = line.speaker === "agent";
  const isConfirm = line.beat === "confirm";
  const beatLabel =
    line.beat === "interrupt"
      ? "Guest jumps in"
      : line.beat === "clarify"
        ? "Clarifying question"
        : line.beat === "modifier"
          ? "From your live menu"
          : line.beat === "confirm"
            ? "Friendly readback"
            : null;

  return (
    <motion.li
      className={cn(
        "flex flex-col gap-0.5 py-1.5",
        isAgent ? "items-end" : "items-start",
        active && "conversation-turn--active"
      )}
      aria-current={active ? "true" : undefined}
      initial={reduced ? false : { opacity: 0, x: isAgent ? 16 : -16, y: 6 }}
      whileInView={reduced ? undefined : { opacity: 1, x: 0, y: 0 }}
      viewport={{ root: scrollRoot, once: true, amount: 0.65 }}
      transition={{
        duration: LANDING_MOTION.revealDuration,
        ease: LANDING_EASE_OUT,
      }}
      onViewportEnter={() => onEnter(line)}
    >
      <motion.div
        className={cn(
          "flex max-w-[92%] flex-col gap-0.5 sm:max-w-[85%]",
          isAgent ? "items-end" : "items-start"
        )}
        animate={
          reduced || !isConfirm || !active ? undefined : { scale: [1, 1.02, 1] }
        }
        transition={{ duration: 0.5, ease: LANDING_EASE_OUT }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
          {isAgent ? "ROAL agent" : "Caller"}
          {beatLabel ? (
            <span className="ml-1.5 font-normal normal-case tracking-normal text-accent">
              · {beatLabel}
            </span>
          ) : null}
        </span>
        <p
          data-turn-bubble
          className={cn(
            "text-pretty rounded-2xl px-3 py-2 text-[13px] leading-relaxed sm:text-sm",
            isAgent
              ? "public-demo-transcript-bubble--agent rounded-br-md text-ink"
              : "rounded-bl-md border border-line bg-card text-ink",
            line.beat === "interrupt" && "ring-2 ring-[rgb(var(--public-accent-lavender)/0.35)]",
            isConfirm && "conversation-bubble--confirm"
          )}
        >
          {line.text}
        </p>
      </motion.div>
    </motion.li>
  );
}

export function ConversationTranscript() {
  const reduced = useLandingReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLOListElement>(null);
  const panelInView = useInView(panelRef, { once: true, amount: 0.25 });
  const [activeLineId, setActiveLineId] = useState<string | null>(null);

  const activeLine = AGENT_CONVERSATION_DEMO.lines.find((l) => l.id === activeLineId);
  const activeTurn: TurnSpeaker | null =
    activeLine?.speaker === "guest" || activeLine?.speaker === "agent"
      ? activeLine.speaker
      : null;

  const handleLineEnter = useCallback((line: TranscriptLine) => {
    setActiveLineId(line.id);
  }, []);

  const live = panelInView || reduced;

  return (
    <motion.div
      ref={panelRef}
      className="conversation-panel public-demo-transcript-panel glass-card mx-auto min-w-0 max-w-2xl overflow-hidden"
      role="region"
      aria-label="Example pickup phone conversation"
    >
      <CallHeader live={live} turn={activeTurn} />

      <ConversationWaveform live={live} turn={activeTurn} reduced={reduced} />

      <p className="sr-only">
        Illustrative phone transcript between a caller and ROAL on pickup. Full
        conversation text is visible in the message list below.
      </p>

      <ol
        ref={scrollRef}
        className="max-h-[min(28rem,70vh)] space-y-0.5 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4"
        aria-label="Conversation messages"
      >
        {AGENT_CONVERSATION_DEMO.lines.map((line) => (
          <TranscriptBubble
            key={line.id}
            line={line}
            active={activeLineId === line.id}
            reduced={reduced}
            scrollRoot={scrollRef}
            onEnter={handleLineEnter}
          />
        ))}
      </ol>

      <div className="public-demo-transcript-panel__footer">
        Illustrative transcript for demo purposes—not a recording of a live call.
      </div>
    </motion.div>
  );
}

function WaveIcon() {
  return (
    <svg
      className="h-5 w-5 text-accent"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
