"use client";

import { useState, useTransition } from "react";
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
        setMessage({ tone: "ok", text: "Saved. Your host is re-syncing with the new persona." });
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
    <section id="persona" className="host-persona card min-w-0" aria-labelledby="persona-title">
      <header className="host-persona__head">
        <div className="min-w-0">
          <h2 id="persona-title" className="host-persona__title">
            Persona
          </h2>
          <p className="host-persona__lead">
            Name, voice, and how your host answers. Saving re-syncs the agent.
          </p>
        </div>
      </header>

      <div className="host-persona__grid">
        <div className="min-w-0">
          <label htmlFor={`host-name-${restaurantId}`} className="field-label">
            Host name
          </label>
          <input
            id={`host-name-${restaurantId}`}
            className="input-base"
            value={name}
            maxLength={40}
            placeholder="Addy"
            autoComplete="off"
            disabled={pending}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-subtle">
            Callers hear this name in the greeting and when they ask who they are talking to.
          </p>

          <label htmlFor={`host-greeting-${restaurantId}`} className="field-label mt-4">
            Custom greeting <span className="font-normal text-subtle">(optional)</span>
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
          />
          <p className="mt-1.5 text-xs text-subtle">
            Leave blank to use the default above.
          </p>
        </div>

        <div className="min-w-0">
          <p className="field-label">Voice</p>
          <TrialVoicePicker value={voiceId} disabled={pending} onChange={setVoiceId} />
        </div>
      </div>

      <footer className="host-persona__foot">
        {message ? (
          <p
            className={
              message.tone === "error"
                ? "host-persona__msg host-persona__msg--error"
                : "host-persona__msg"
            }
            role={message.tone === "error" ? "alert" : "status"}
          >
            {message.text}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="btn-primary"
          onClick={save}
          disabled={pending || !dirty || !name.trim()}
          aria-busy={pending}
        >
          {pending ? "Saving…" : "Save persona"}
        </button>
      </footer>
    </section>
  );
}
