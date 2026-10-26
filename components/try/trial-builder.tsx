"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { TrialPublicView, TrialStepLogEntry, TrialTranscriptTurn } from "@/lib/trial/types";
import { scoreTranscript } from "@/lib/trial/scorecard";
import { trialApi } from "./trial-api";
import { TrialCall } from "./trial-call";
import { TrialScorecardPanel } from "./trial-scorecard";
import { TrialVoicePicker } from "./trial-voice-picker";
import "./trial.css";

type BuilderPhase = "input" | "building" | "ready" | "failed";

export type TrialBuilderProps = {
  /** Public: claim sends to signup. Dashboard: claim runs in place via `onClaim`. */
  mode: "public" | "dashboard";
  initialTrial?: TrialPublicView | null;
  /** Dashboard mode: create the trial server-side (sets the cookie) and return it. */
  startTrial?: (input: string) => Promise<TrialPublicView>;
  /** Dashboard mode: promote the trial into a real restaurant. */
  onClaim?: (trialId: string) => Promise<void>;
  claimHref?: string;
  autofocus?: boolean;
  /** Compact hero embed: hide the headline block. */
  embedded?: boolean;
};

const STEP_ORDER: Array<{ id: TrialStepLogEntry["id"]; title: string }> = [
  { id: "listing", title: "Finding your restaurant" },
  { id: "menu", title: "Reading your menu" },
  { id: "agent", title: "Training your phone host" },
];

const EXAMPLES = ["joespizza.com", "maps.google.com/…/Blue+Moon+Cafe", "Taqueria Sol, Austin"];

export function TrialBuilder({
  mode,
  initialTrial = null,
  startTrial,
  onClaim,
  claimHref = "/signup?next=%2Fdashboard%2Fonboarding",
  autofocus = false,
  embedded = false,
}: TrialBuilderProps) {
  const [phase, setPhase] = useState<BuilderPhase>(() =>
    initialTrial?.status === "ready" ? "ready" : "input"
  );
  const [input, setInput] = useState(initialTrial?.sourceInput ?? "");
  const [trial, setTrial] = useState<TrialPublicView | null>(initialTrial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [liveScorecard, setLiveScorecard] = useState(initialTrial?.scorecard ?? {});
  const [menuUrl, setMenuUrl] = useState("");
  const [showMenuFix, setShowMenuFix] = useState(false);
  const [editingPersona, setEditingPersona] = useState(false);
  const [agentNameDraft, setAgentNameDraft] = useState(initialTrial?.persona.agentName ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const callsRef = useRef(initialTrial?.callCount ?? 0);

  useEffect(() => {
    if (autofocus) inputRef.current?.focus();
  }, [autofocus]);

  const runPipeline = useCallback(
    async (created: TrialPublicView) => {
      setTrial(created);
      setPhase("building");
      setError(null);

      const listing = await trialApi.listing(created.id);
      if (!listing.ok) {
        if (listing.data?.trial) setTrial(listing.data.trial);
        setError(listing.error);
        setPhase("failed");
        return;
      }
      setTrial(listing.data.trial);

      const menu = await trialApi.menu(created.id);
      if (menu.ok) setTrial(menu.data.trial);

      const agent = await trialApi.agent(created.id);
      if (!agent.ok) {
        setError(agent.error);
        setPhase("failed");
        return;
      }
      setTrial(agent.data.trial);
      setAgentNameDraft(agent.data.trial.persona.agentName);
      setPhase("ready");
    },
    []
  );

  const start = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const value = input.trim();
      if (!value || busy) return;
      setBusy(true);
      setError(null);
      try {
        let created: TrialPublicView;
        if (startTrial) {
          created = await startTrial(value);
        } else {
          const res = await trialApi.start(value);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          created = res.data.trial;
        }
        await runPipeline(created);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start.");
      } finally {
        setBusy(false);
      }
    },
    [busy, input, runPipeline, startTrial]
  );

  const reset = useCallback(() => {
    setPhase("input");
    setTrial(null);
    setError(null);
    setLiveScorecard({});
    setShowMenuFix(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const savePersona = useCallback(
    async (patch: { agentName?: string; voiceId?: string }) => {
      if (!trial) return;
      setBusy(true);
      const res = await trialApi.persona(trial.id, patch);
      setBusy(false);
      if (res.ok) setTrial(res.data.trial);
      else setError(res.error);
    },
    [trial]
  );

  const fixMenu = useCallback(
    async (payload: { menu_url?: string } | FormData) => {
      if (!trial) return;
      setBusy(true);
      setError(null);
      const res = await trialApi.menu(trial.id, payload);
      if (res.ok) {
        const agent = await trialApi.agent(trial.id);
        setTrial(agent.ok ? agent.data.trial : res.data.trial);
        setShowMenuFix(false);
        setMenuUrl("");
      } else {
        setError(res.error);
      }
      setBusy(false);
    },
    [trial]
  );

  const onTranscript = useCallback(
    (turns: TrialTranscriptTurn[]) => {
      setLiveScorecard((prev) => scoreTranscript(turns, prev));
    },
    []
  );

  const onCallEnded = useCallback(
    async (turns: TrialTranscriptTurn[]) => {
      callsRef.current += 1;
      if (!trial) return;
      const res = await trialApi.get(trial.id);
      if (res.ok) {
        setTrial(res.data.trial);
        setLiveScorecard(res.data.trial.scorecard);
      } else if (turns.length) {
        setLiveScorecard((prev) => scoreTranscript(turns, prev));
      }
    },
    [trial]
  );

  const claim = useCallback(async () => {
    if (!trial || !onClaim) return;
    setClaiming(true);
    setError(null);
    try {
      await onClaim(trial.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish setup.");
      setClaiming(false);
    }
  }, [onClaim, trial]);

  /* ----------------------------------------------------------------------- */

  if (phase === "input" || phase === "failed") {
    return (
      <div className={cn("trial-builder", embedded && "trial-builder--embedded")} data-phase={phase}>
        {!embedded ? (
          <div className="trial-builder__intro">
            <p className="chip chip--accent">Try it in 60 seconds · no sign-up</p>
            <h2 className="trial-builder__title">Paste your restaurant. Talk to your new phone host.</h2>
            <p className="trial-builder__lead">
              We read your website or Google listing, learn your menu and hours, and put an AI host on the line you can call right now.
            </p>
          </div>
        ) : null}
        <form className="trial-form" onSubmit={start}>
          <label className="sr-only" htmlFor="trial-input">
            Restaurant website, Google Maps link, or name and city
          </label>
          <div className="trial-form__row">
            <span className="trial-form__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
            </span>
            <input
              id="trial-input"
              ref={inputRef}
              className="trial-form__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="yourrestaurant.com or a Google Maps link"
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              inputMode="url"
            />
            <button type="submit" className="btn-primary btn-lg trial-form__submit" disabled={busy || !input.trim()}>
              {busy ? "Building…" : "Build my phone host"}
              {!busy ? <ArrowIcon /> : null}
            </button>
          </div>
          <p className="trial-form__examples">
            Try:
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="trial-form__example" onClick={() => setInput(ex.includes("…") ? "" : ex)} disabled={busy}>
                {ex}
              </button>
            ))}
            <span className="trial-form__examples-note">or “Name, City”</span>
          </p>
        </form>
        {error ? (
          <p className="trial-builder__error" role="alert">
            {error}
          </p>
        ) : null}
        {phase === "failed" && trial ? <StepList trial={trial} compact /> : null}
      </div>
    );
  }

  if (phase === "building" && trial) {
    return (
      <div className={cn("trial-builder", embedded && "trial-builder--embedded")} data-phase="building">
        <div className="trial-building">
          <p className="trial-building__source">
            <span className="pulse-dot pulse-dot--accent" /> Building from <strong>{trial.sourceInput}</strong>
          </p>
          <StepList trial={trial} />
          <p className="trial-building__hint">Usually 20–40 seconds. We only read public pages.</p>
        </div>
      </div>
    );
  }

  if (!trial) return null;
  const persona = trial.persona;
  const menuIsSample = trial.menuSummary?.source === "sample";
  const scorecard = liveScorecard;

  return (
    <div className={cn("trial-builder trial-builder--ready", embedded && "trial-builder--embedded")} data-phase="ready">
      <div className="trial-ready">
        <section className="trial-ready__call card card--raised" aria-label="Test call">
          <header className="trial-ready__head">
            <div className="min-w-0">
              <p className="chip chip--success">
                <span className="pulse-dot" /> Live · {trial.restaurantName}
              </p>
              <h3 className="trial-ready__title">
                Meet {persona.agentName}, your phone host.
              </h3>
              <p className="trial-ready__sub">
                Call from your browser. Order something, ask about hours, change your mind — it already knows your menu.
              </p>
            </div>
            <button type="button" className="btn-ghost btn-sm" onClick={reset} disabled={busy || claiming}>
              Try another restaurant
            </button>
          </header>
          <TrialCall
            trialId={trial.id}
            agentName={persona.agentName}
            restaurantName={trial.restaurantName ?? "your restaurant"}
            onTranscript={onTranscript}
            onCallEnded={onCallEnded}
          />
        </section>

        <aside className="trial-ready__side">
          <div className="card trial-facts">
            <p className="trial-facts__title">What {persona.agentName} knows</p>
            <ul className="trial-facts__list">
              <li>
                <FactIcon kind="menu" />
                <span>
                  {trial.menuSummary && !menuIsSample ? (
                    <>
                      <strong>{trial.menuSummary.itemCount} menu items</strong> in {trial.menuSummary.categoryCount} categories
                      {trial.menuSummary.sampleItems.length ? (
                        <span className="trial-facts__sample">
                          {trial.menuSummary.sampleItems.slice(0, 3).map((i) => i.name).join(" · ")}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <strong>Sample menu</strong> — we couldn&apos;t read a priced menu online.{" "}
                      <button type="button" className="trial-link" onClick={() => setShowMenuFix((v) => !v)}>
                        Add yours
                      </button>
                    </>
                  )}
                </span>
              </li>
              <li>
                <FactIcon kind="hours" />
                <span>
                  {trial.hours ? <strong>Weekly hours</strong> : <strong>Hours not found</strong>}
                  {trial.hours ? " from your listing" : " — it will say staff can confirm"}
                </span>
              </li>
              <li>
                <FactIcon kind="pin" />
                <span>
                  {trial.profile?.address_line1 ? (
                    <>
                      <strong>{trial.profile.address_line1}</strong>
                      {trial.profile.city ? `, ${trial.profile.city}` : ""}
                    </>
                  ) : (
                    <strong>Address not found</strong>
                  )}
                </span>
              </li>
              <li>
                <FactIcon kind="faq" />
                <span>
                  {trial.knowledge.length > 0 ? (
                    <>
                      <strong>{trial.knowledge.length} FAQs</strong> pulled from your site
                    </>
                  ) : (
                    <strong>No FAQs yet</strong>
                  )}
                </span>
              </li>
            </ul>
            {showMenuFix ? (
              <div className="trial-menu-fix">
                <label className="field-label" htmlFor="trial-menu-url">Menu page link</label>
                <div className="flex gap-2">
                  <input
                    id="trial-menu-url"
                    className="input-base"
                    placeholder="https://yourrestaurant.com/menu"
                    value={menuUrl}
                    onChange={(e) => setMenuUrl(e.target.value)}
                    disabled={busy}
                  />
                  <button type="button" className="btn-primary" disabled={busy || !menuUrl.trim()} onClick={() => fixMenu({ menu_url: menuUrl.trim() })}>
                    Read
                  </button>
                </div>
                <p className="trial-menu-fix__or">
                  or{" "}
                  <button type="button" className="trial-link" onClick={() => fileRef.current?.click()} disabled={busy}>
                    upload a menu photo
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append("image", file);
                      void fixMenu(fd);
                      e.target.value = "";
                    }}
                  />
                </p>
              </div>
            ) : null}
          </div>

          <div className="card trial-persona">
            <div className="trial-persona__head">
              <p className="trial-facts__title">Voice &amp; name</p>
              <button type="button" className="trial-link" onClick={() => setEditingPersona((v) => !v)} disabled={busy}>
                {editingPersona ? "Done" : "Change"}
              </button>
            </div>
            {editingPersona ? (
              <div className="space-y-3">
                <div>
                  <label className="field-label" htmlFor="trial-agent-name">Host name</label>
                  <div className="flex gap-2">
                    <input
                      id="trial-agent-name"
                      className="input-base"
                      value={agentNameDraft}
                      maxLength={40}
                      onChange={(e) => setAgentNameDraft(e.target.value)}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={busy || !agentNameDraft.trim() || agentNameDraft.trim() === persona.agentName}
                      onClick={() => savePersona({ agentName: agentNameDraft.trim() })}
                    >
                      Save
                    </button>
                  </div>
                </div>
                <TrialVoicePicker value={persona.voiceId} disabled={busy} onChange={(voiceId) => savePersona({ voiceId })} />
                <p className="trial-persona__note">Changes apply on your next call.</p>
              </div>
            ) : (
              <p className="trial-persona__summary">
                <strong>{persona.agentName}</strong> · {persona.voiceLabel} voice
              </p>
            )}
          </div>

          <TrialScorecardPanel scorecard={scorecard} compact />

          <div className="card card--ink trial-claim">
            <p className="trial-claim__title">Like what you hear?</p>
            <p className="trial-claim__body">
              Keep {persona.agentName}. We save the menu, hours, voice, and FAQs, give you a dedicated line, and you forward your number when you&apos;re ready.
            </p>
            {mode === "dashboard" && onClaim ? (
              <button type="button" className="btn-accent btn-lg w-full" onClick={claim} disabled={claiming || busy}>
                {claiming ? "Setting up your restaurant…" : "Finish setup"}
              </button>
            ) : (
              <Link href={claimHref} className="btn-accent btn-lg w-full">
                Claim this phone host <ArrowIcon />
              </Link>
            )}
            <p className="trial-claim__fine">Free to set up. $0.90 per completed phone order. No contracts.</p>
          </div>
          {error ? (
            <p className="trial-builder__error" role="alert">
              {error}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function StepList({ trial, compact = false }: { trial: TrialPublicView; compact?: boolean }) {
  return (
    <ol className={cn("trial-steps", compact && "trial-steps--compact")}>
      {STEP_ORDER.map((step, i) => {
        const entry = trial.steps.find((s) => s.id === step.id);
        const status = entry?.status ?? "pending";
        const title = entry?.title ?? step.title;
        return (
          <li key={step.id} className={cn("trial-step", `trial-step--${status}`)}>
            <span className="trial-step__icon" aria-hidden="true">
              {status === "done" ? (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4 4L19 7" /></svg>
              ) : status === "running" ? (
                <span className="trial-step__spinner" />
              ) : status === "failed" ? (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              ) : status === "skipped" ? (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14" /></svg>
              ) : (
                <span className="tabular-nums">{i + 1}</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="trial-step__title">{title}</span>
              {entry?.detail ? <span className="trial-step__detail">{entry.detail}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function FactIcon({ kind }: { kind: "menu" | "hours" | "pin" | "faq" }) {
  const paths: Record<typeof kind, string> = {
    menu: "M4 5h16M4 12h16M4 19h10",
    hours: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    pin: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    faq: "M8 10h8M8 14h5M21 12a9 9 0 0 1-13.6 7.7L3 21l1.3-4.4A9 9 0 1 1 21 12Z",
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="trial-facts__icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[kind]} />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h13m-5-5 5 5-5 5" />
    </svg>
  );
}
