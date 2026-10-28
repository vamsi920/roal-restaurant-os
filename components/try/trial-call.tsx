"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation as ConversationType } from "@elevenlabs/client";
import { cn } from "@/lib/cn";
import type { TrialTranscriptTurn } from "@/lib/trial/types";
import { trialApi } from "./trial-api";

type CallPhase = "idle" | "connecting" | "live" | "ending" | "ended" | "error";

type Props = {
  trialId: string;
  agentName: string;
  restaurantName: string;
  /** Called after every call ends with the full transcript (already persisted). */
  onCallEnded?: (turns: TrialTranscriptTurn[]) => void;
  /** Called when the transcript grows during the call (for live scorecard updates). */
  onTranscript?: (turns: TrialTranscriptTurn[]) => void;
  /** Dashboard mode talks to a real agent via a provided signed URL instead of the trial API. */
  getSession?: () => Promise<{ signedUrl: string; overrides?: Record<string, unknown> }>;
  /** Persist turns to the trial transcript endpoint (trials only). */
  persistTranscript?: boolean;
  compact?: boolean;
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TrialCall({
  trialId,
  agentName,
  restaurantName,
  onCallEnded,
  onTranscript,
  getSession,
  persistTranscript = true,
  compact = false,
}: Props) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [mode, setMode] = useState<"speaking" | "listening">("listening");
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<TrialTranscriptTurn[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const conversationRef = useRef<ConversationType | null>(null);
  const turnsRef = useRef<TrialTranscriptTurn[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const endedRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const finalize = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    stopTimer();
    setPhase("ended");
    const finalTurns = turnsRef.current;
    if (persistTranscript && finalTurns.length > 0) {
      await trialApi.transcript(trialId, finalTurns);
    }
    onCallEnded?.(finalTurns);
  }, [onCallEnded, persistTranscript, stopTimer, trialId]);

  const endCall = useCallback(async () => {
    setPhase("ending");
    try {
      await conversationRef.current?.endSession();
    } catch {
      // Already closed.
    }
    conversationRef.current = null;
    await finalize();
  }, [finalize]);

  const startCall = useCallback(async () => {
    setError(null);
    setTurns([]);
    turnsRef.current = [];
    endedRef.current = false;
    setElapsed(0);
    setPhase("connecting");

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPhase("error");
      setError("Microphone access is needed for a test call. Allow the mic and try again.");
      return;
    }

    let session: { signedUrl: string; overrides?: Record<string, unknown> };
    try {
      if (getSession) {
        session = await getSession();
      } else {
        const res = await trialApi.call(trialId);
        if (!res.ok) {
          setPhase("error");
          setError(res.error);
          return;
        }
        session = { signedUrl: res.data.signedUrl, overrides: res.data.overrides };
      }
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Could not start the call.");
      return;
    }

    try {
      const { Conversation } = await import("@elevenlabs/client");
      const conversation = await Conversation.startSession({
        signedUrl: session.signedUrl,
        connectionType: "websocket",
        overrides: session.overrides as never,
        onConnect: () => {
          setPhase("live");
          stopTimer();
          timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
        },
        onDisconnect: () => {
          conversationRef.current = null;
          void finalize();
        },
        onError: (message: string) => {
          setError(message || "The call dropped. Try again.");
        },
        onModeChange: ({ mode: next }: { mode: "speaking" | "listening" }) => setMode(next),
        onMessage: ({ message, role }: { message: string; role: "user" | "agent" }) => {
          // Eleven v4 delivery tags like "[warmly]" steer the voice; they aren't words to show.
          const text = message.replace(/\[[a-z][a-z '-]{0,30}\]\s*/gi, "").trim();
          if (!text) return;
          const turn: TrialTranscriptTurn = { role, text, at: Date.now() };
          turnsRef.current = [...turnsRef.current, turn];
          setTurns(turnsRef.current);
          onTranscript?.(turnsRef.current);
        },
      });
      conversationRef.current = conversation;
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Could not connect the call.");
    }
  }, [finalize, getSession, onTranscript, stopTimer, trialId]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns]);

  useEffect(() => {
    return () => {
      stopTimer();
      void conversationRef.current?.endSession().catch(() => undefined);
    };
  }, [stopTimer]);

  const live = phase === "live";
  const busy = phase === "connecting" || phase === "ending";

  return (
    <div className={cn("trial-call", compact && "trial-call--compact")} data-phase={phase}>
      <div className="trial-call__stage">
        <div
          className={cn(
            "trial-orb",
            live && mode === "speaking" && "trial-orb--speaking",
            live && mode === "listening" && "trial-orb--listening",
            phase === "connecting" && "trial-orb--connecting"
          )}
          aria-hidden="true"
        >
          <span className="trial-orb__core" />
          <span className="trial-orb__ring" />
          <span className="trial-orb__ring trial-orb__ring--2" />
        </div>
        <div className="trial-call__meta">
          <p className="trial-call__name">{agentName}</p>
          <p className="trial-call__status" aria-live="polite">
            {phase === "idle" && `Ready to answer for ${restaurantName}`}
            {phase === "connecting" && "Connecting…"}
            {live && (mode === "speaking" ? `${agentName} is speaking` : "Listening to you")}
            {phase === "ending" && "Hanging up…"}
            {phase === "ended" && "Call ended"}
            {phase === "error" && "Could not connect"}
          </p>
          {(live || phase === "ended") && (
            <p className="trial-call__timer tabular-nums">{formatDuration(elapsed)}</p>
          )}
        </div>
        <div className="trial-call__actions">
          {live || busy ? (
            <button type="button" className="btn-danger btn-lg" onClick={endCall} disabled={busy}>
              <PhoneOffIcon /> End call
            </button>
          ) : (
            <button type="button" className="btn-accent btn-lg" onClick={startCall}>
              <PhoneIcon /> {phase === "ended" ? "Call again" : `Call ${agentName}`}
            </button>
          )}
        </div>
        {error ? (
          <p className="trial-call__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="trial-call__transcript" aria-label="Live transcript" aria-live="polite">
        {turns.length === 0 ? (
          <p className="trial-call__transcript-empty">
            {live ? "Say hello — the transcript shows up here as you talk." : "Your conversation will appear here."}
          </p>
        ) : (
          <ol>
            {turns.map((t, i) => (
              <li key={`${t.at}-${i}`} className={cn("trial-turn", t.role === "agent" ? "trial-turn--agent" : "trial-turn--user")}>
                <span className="trial-turn__who">{t.role === "agent" ? agentName : "You"}</span>
                <span className="trial-turn__text">{t.text}</span>
              </li>
            ))}
          </ol>
        )}
        <div ref={transcriptEndRef} />
      </div>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.8 2.1Z" />
    </svg>
  );
}

function PhoneOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.7 13.3a16 16 0 0 1-2.7-3.4l1.3-1.3a2 2 0 0 0 .5-2.1c-.3-.9-.6-1.9-.7-2.8A2 2 0 0 0 7.1 2h-3a2 2 0 0 0-2 2.2 19.8 19.8 0 0 0 3.1 8.6M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1M23 1 1 23" />
    </svg>
  );
}
