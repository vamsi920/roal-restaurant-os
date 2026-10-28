"use client";

import { useState, useTransition } from "react";
import { Mic } from "lucide-react";
import { IconTile } from "@/components/ui";
import { SaveRow } from "@/components/live-orders/workspace-ui";
import { TrialVoicePicker } from "@/components/try/trial-voice-picker";
import { DEFAULT_TRIAL_VOICE, findTrialVoice } from "@/lib/trial/voices";
import { saveHostPersonaAction } from "@/app/dashboard/restaurants/[id]/persona-actions";
import "@/components/try/trial.css";

type Props = {
  restaurantId: string;
  restaurantName: string;
  initialName: string | null;
  initialVoiceId: string | null;
  initialGreeting: string | null;
  /** Fired after a successful save so the page can update the host name elsewhere. */
  onSaved?: (next: { name: string; voiceLabel: string | null }) => void;
};

export function HostPersonaCard({
  restaurantId,
  restaurantName,
  initialName,
  initialVoiceId,
  initialGreeting,
  onSaved,
}: Props) {
  const [name, setName] = useState(initialName ?? "");
  const [voiceId, setVoiceId] = useState(
    findTrialVoice(initialVoiceId)?.id ?? DEFAULT_TRIAL_VOICE.id
  );
  const [greeting, setGreeting] = useState(initialGreeting ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const dirty =
    name.trim() !== (initialName ?? "").trim() ||
    voiceId !== (findTrialVoice(initialVoiceId)?.id ?? DEFAULT_TRIAL_VOICE.id) ||
    greeting.trim() !== (initialGreeting ?? "").trim();

  const defaultGreeting = `Thanks for calling ${restaurantName}, this is ${
    name.trim() || "your host"
  }. Pickup order or a question?`;

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await saveHostPersonaAction(restaurantId, {
          agentDisplayName: name,
          agentVoiceId: voiceId,
          agentGreeting: greeting,
        });
        setMessage({ tone: "ok", text: "Saved. Your host will use this on the next call." });
        onSaved?.({ name: res.agentDisplayName, voiceLabel: res.agentVoiceLabel });
      } catch (e) {
        setMessage({
          tone: "error",
          text: e instanceof Error ? e.message : "Could not save the persona.",
        });
      }
    });
  }

  return (
    <section id="persona" className="panel min-w-0 scroll-mt-24" aria-labelledby="persona-title">
      <div className="panel__head">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile icon={Mic} color="blue" />
          <div className="min-w-0">
            <h2 id="persona-title" className="panel__title">
              Voice &amp; name
            </h2>
            <p className="text-[12.5px] text-subtle">How your host sounds and introduces itself.</p>
          </div>
        </div>
      </div>

      <div className="panel__body space-y-5">
        <div className="grid min-w-0 gap-4">
          <div className="min-w-0">
            <label htmlFor={`host-name-${restaurantId}`} className="field-label">
              Host name
            </label>
            <input
              id={`host-name-${restaurantId}`}
              className="input-base max-sm:h-11"
              value={name}
              maxLength={40}
              placeholder={findTrialVoice(voiceId)?.label ?? DEFAULT_TRIAL_VOICE.label}
              autoComplete="off"
              disabled={pending}
              onChange={(e) => setName(e.target.value)}
              aria-describedby={`host-name-hint-${restaurantId}`}
            />
            <p id={`host-name-hint-${restaurantId}`} className="mt-1.5 text-[12px] text-subtle">
              Callers hear this name in the greeting and when they ask who they&apos;re talking to.
            </p>
          </div>

          <div className="min-w-0">
            <label htmlFor={`host-greeting-${restaurantId}`} className="field-label">
              Greeting <span className="font-normal text-subtle">(optional)</span>
            </label>
            <textarea
              id={`host-greeting-${restaurantId}`}
              className="input-base"
              rows={3}
              maxLength={400}
              placeholder={defaultGreeting}
              disabled={pending}
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              aria-describedby={`host-greeting-hint-${restaurantId}`}
            />
            <p id={`host-greeting-hint-${restaurantId}`} className="mt-1.5 text-[12px] text-subtle">
              Leave blank to use the default shown above.
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <p className="field-label" id={`host-voice-label-${restaurantId}`}>
            Voice
          </p>
          <div role="group" aria-labelledby={`host-voice-label-${restaurantId}`} className="min-w-0">
            <TrialVoicePicker value={voiceId} disabled={pending} onChange={setVoiceId} />
          </div>
        </div>

        <SaveRow
          message={message?.text ?? (dirty ? "Unsaved changes" : "Changes apply to your next call.")}
          tone={message ? (message.tone === "error" ? "bad" : "ok") : "muted"}
        >
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={save}
            disabled={pending || !dirty || !name.trim()}
            aria-busy={pending}
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </SaveRow>
      </div>
    </section>
  );
}
