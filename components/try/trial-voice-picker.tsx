"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { TRIAL_VOICE_OPTIONS } from "@/lib/trial/voices";
import { trialApi } from "./trial-api";

type VoiceRow = (typeof TRIAL_VOICE_OPTIONS)[number] & { previewUrl: string | null };

type Props = {
  value: string;
  disabled?: boolean;
  onChange: (voiceId: string) => void;
};

/** Hear each voice before choosing (Popmenu-style "pick by ear"). */
export function TrialVoicePicker({ value, disabled, onChange }: Props) {
  const [voices, setVoices] = useState<VoiceRow[]>(
    TRIAL_VOICE_OPTIONS.map((v) => ({ ...v, previewUrl: null }))
  );
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void trialApi.voices().then((res) => {
      if (cancelled || !res.ok) return;
      setVoices(res.data.voices as VoiceRow[]);
    });
    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, []);

  function preview(voice: VoiceRow) {
    if (!voice.previewUrl) return;
    if (playing === voice.id) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(voice.previewUrl);
    audioRef.current = audio;
    audio.onended = () => setPlaying(null);
    audio.onerror = () => setPlaying(null);
    void audio.play().then(() => setPlaying(voice.id)).catch(() => setPlaying(null));
  }

  // Core voices plus the selected accent voice stay visible; other accents sit behind a toggle.
  const visible = voices.filter((v) => !v.libraryOwnerId || v.id === value);
  const extra = voices.filter((v) => v.libraryOwnerId && v.id !== value);
  visible.sort((a, b) => Number(b.id === value && Boolean(b.libraryOwnerId)) - Number(a.id === value && Boolean(a.libraryOwnerId)));
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? [...visible, ...extra] : visible;

  return (
    <>
    <div className="trial-voices" role="radiogroup" aria-label="Agent voice">
      {shown.map((voice) => {
        const selected = voice.id === value;
        return (
          <div key={voice.id} className={cn("trial-voice", selected && "trial-voice--selected")}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              className="trial-voice__pick"
              onClick={() => onChange(voice.id)}
            >
              <span className="trial-voice__name">{voice.label}</span>
              <span className="trial-voice__desc">{voice.description}</span>
              <span className="trial-voice__accent">{voice.accent}</span>
            </button>
            <button
              type="button"
              className={cn("trial-voice__play", playing === voice.id && "is-playing")}
              aria-label={playing === voice.id ? `Stop ${voice.label} preview` : `Hear ${voice.label}`}
              disabled={!voice.previewUrl}
              title={voice.previewUrl ? "Hear a sample" : "Preview unavailable"}
              onClick={() => preview(voice)}
            >
              {playing === voice.id ? (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
              )}
            </button>
          </div>
        );
      })}
    </div>
    {extra.length > 0 ? (
      <button type="button" className="trial-voices__more" onClick={() => setShowAll((v) => !v)}>
        {showAll ? "Fewer voices" : `More accents (${extra.length})`}
      </button>
    ) : null}
    </>
  );
}
