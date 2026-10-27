"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RoalWordmark } from "@/components/landing/roal-wordmark";
import { TrialCall } from "@/components/try/trial-call";
import { trialApi, type TrialApiResult } from "@/components/try/trial-api";
import { cn } from "@/lib/cn";
import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";
import {
  estimateMissedRevenue,
  MISSED_CALL_OPTIONS,
  TICKET_OPTIONS,
  type MissedCallId,
  type TicketId,
} from "@/lib/start/estimate";
import type { TrialPublicView } from "@/lib/trial/types";
import "./start.css";

type Step =
  | "link"
  | "search"
  | "confirm"
  | "missed"
  | "ticket"
  | "insight"
  | "menu"
  | "pricing"
  | "build"
  | "meet"
  | "contact"
  | "done";

const PUBLIC_FLOW: Step[] = ["link", "search", "confirm", "missed", "ticket", "insight", "menu", "pricing", "build", "meet", "contact", "done"];
const DASHBOARD_FLOW: Step[] = ["link", "search", "confirm", "missed", "ticket", "insight", "menu", "pricing", "build", "meet"];
/** Steps the back arrow can return from (the async ones can't be undone). */
const BACKABLE: Step[] = ["missed", "ticket", "insight", "pricing", "contact"];

const SEARCH_LINES = [
  "Opening your website",
  "Finding your address and phone",
  "Reading your hours",
  "Looking for your menu",
  "Pulling answers to common questions",
];

const BUILD_LINES = [
  "Learning your menu items and prices",
  "Loading your opening hours",
  "Writing answers to common questions",
  "Teaching it to take pickup orders",
  "Picking a warm, natural voice",
];

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CallStatus = "placed" | "unavailable" | "failed" | "busy";

export type StartFunnelProps = {
  mode: "public" | "dashboard";
  initialQuery?: string | null;
  initialTrial?: TrialPublicView | null;
  /** Dashboard: create the trial server-side (sets the cookie). */
  startTrial?: (input: string) => Promise<TrialPublicView>;
  /** Dashboard: turn the trial into a real restaurant. */
  onClaim?: (trialId: string) => Promise<void>;
  /** Where "Exit" goes; null hides it (first-run signup has nowhere else to go). */
  exitHref?: string | null;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Full-screen, one-question-per-screen onboarding: link → restaurant → pain → menu → price → host → call. */
export function StartFunnel({
  mode,
  initialQuery = null,
  initialTrial = null,
  startTrial,
  onClaim,
  exitHref = "/",
}: StartFunnelProps) {
  const flow = mode === "public" ? PUBLIC_FLOW : DASHBOARD_FLOW;
  const [step, setStep] = useState<Step>(initialTrial?.status === "ready" ? "meet" : initialQuery ? "search" : "link");
  const [history, setHistory] = useState<Step[]>([]);
  const [input, setInput] = useState(initialQuery ?? initialTrial?.sourceInput ?? "");
  const [trial, setTrial] = useState<TrialPublicView | null>(initialTrial);
  const [error, setError] = useState<string | null>(null);
  const [missed, setMissed] = useState<MissedCallId | undefined>();
  const [ticket, setTicket] = useState<TicketId | undefined>();
  const [menuReady, setMenuReady] = useState(Boolean(initialTrial?.menuSummary));
  const [busy, setBusy] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus | null>(null);
  const [calledPhone, setCalledPhone] = useState<string | null>(null);
  const menuPromise = useRef<Promise<TrialApiResult<{ trial: TrialPublicView }>> | null>(null);
  const autoStarted = useRef(false);
  const reduce = useReducedMotion();

  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const go = useCallback((next: Step, remember = true) => {
    setError(null);
    if (remember && BACKABLE.includes(next)) setHistory((h) => [...h, stepRef.current]);
    setStep(next);
  }, []);

  const back = useCallback(() => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setError(null);
    setHistory(history.slice(0, -1));
    setStep(prev);
  }, [history]);

  /* --------------------------- link → search → confirm --------------------------- */

  const search = useCallback(
    async (value: string) => {
      const q = value.trim();
      if (!q) return;
      setInput(q);
      setError(null);
      setStep("search");
      const minDelay = wait(reduce ? 400 : 2600);
      try {
        let created: TrialPublicView;
        if (startTrial) {
          created = await startTrial(q);
        } else {
          const res = await trialApi.start(q);
          if (!res.ok) throw new Error(res.error);
          created = res.data.trial;
        }
        const listing = await trialApi.listing(created.id);
        await minDelay;
        if (!listing.ok) throw new Error(listing.error);
        setTrial(listing.data.trial);
        // Read the menu in the background while the owner answers questions.
        setMenuReady(false);
        menuPromise.current = trialApi.menu(created.id).then((r) => {
          if (r.ok) setTrial(r.data.trial);
          setMenuReady(true);
          return r;
        });
        setHistory([]);
        setStep("confirm");
      } catch (e) {
        await minDelay;
        setError(e instanceof Error ? e.message : "We couldn't find that restaurant.");
        setStep("link");
      }
    },
    [reduce, startTrial]
  );

  useEffect(() => {
    if (initialQuery && !initialTrial && !autoStarted.current) {
      autoStarted.current = true;
      void search(initialQuery);
    }
  }, [initialQuery, initialTrial, search]);

  const notUs = useCallback(() => {
    setTrial(null);
    setInput("");
    setError("No problem. Try your Google Maps link, or type the name and city, like “Taqueria Sol, Austin”.");
    setStep("link");
  }, []);

  /* ------------------------------- menu → build → meet ------------------------------- */

  const openMenu = useCallback(async () => {
    go("menu", false);
    if (menuPromise.current) await menuPromise.current;
    setMenuReady(true);
  }, [go]);

  const fixMenu = useCallback(
    async (payload: { menu_url?: string } | FormData) => {
      if (!trial) return;
      setBusy(true);
      setError(null);
      const res = await trialApi.menu(trial.id, payload);
      setBusy(false);
      if (res.ok) setTrial(res.data.trial);
      else setError(res.error);
    },
    [trial]
  );

  const build = useCallback(async () => {
    if (!trial) return;
    go("build", false);
    const minDelay = wait(reduce ? 400 : 5200);
    const res = await trialApi.agent(trial.id);
    await minDelay;
    if (!res.ok) {
      setError(res.error);
      setStep("pricing");
      return;
    }
    setTrial(res.data.trial);
    setHistory([]);
    setStep("meet");
  }, [go, reduce, trial]);

  /* ----------------------------------- claim / lead ----------------------------------- */

  const claim = useCallback(async () => {
    if (!trial || !onClaim) return;
    setBusy(true);
    setError(null);
    try {
      await onClaim(trial.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not finish setup.");
      setBusy(false);
    }
  }, [onClaim, trial]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const submitLead = useCallback(
    async (form: { name: string; phone: string; email: string }) => {
      if (!trial) return;
      setBusy(true);
      setError(null);
      setFieldErrors({});
      const res = await trialApi.lead(trial.id, { ...form, answers: { missedCalls: missed, ticket } });
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        setFieldErrors(res.data?.fields ?? {});
        return;
      }
      setCallStatus(res.data.callStatus);
      setCalledPhone(res.data.phone);
      setHistory([]);
      setStep("done");
    },
    [missed, ticket, trial]
  );

  /* --------------------------------------- view --------------------------------------- */

  const index = Math.max(0, flow.indexOf(step));
  const progress = step === "link" ? 0.04 : (index + 1) / flow.length;
  const name = trial?.restaurantName ?? trial?.profile?.name ?? "your restaurant";
  // The host's name follows the cuisine's voice, so it is only known once the site is read.
  const agentName = trial?.profile ? trial.persona.agentName : "your host";
  const estimate = useMemo(() => estimateMissedRevenue(missed, ticket), [missed, ticket]);

  const motionProps = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 28, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -18, filter: "blur(4px)" },
      };

  return (
    <div className="sf" data-step={step}>
      <div className="sf__glow" aria-hidden />
      <header className="sf__top">
        <div className="sf__top-row">
          {history.length > 0 && BACKABLE.includes(step) ? (
            <button type="button" className="sf__back" onClick={back} aria-label="Back">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
            </button>
          ) : (
            <span className="sf__back sf__back--ghost" aria-hidden />
          )}
          <Link href={mode === "public" ? "/" : "/dashboard"} className="sf__logo" aria-label="ROAL home">
            <RoalWordmark />
          </Link>
          {exitHref ? (
            <Link href={exitHref} className="sf__exit">
              Exit
            </Link>
          ) : (
            <span aria-hidden />
          )}
        </div>
        <div className="sf__progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <motion.span className="sf__progress-bar" animate={{ scaleX: progress }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
        </div>
      </header>

      <main className="sf__stage">
        <AnimatePresence mode="wait">
          <motion.section
            key={step}
            className="sf__screen"
            {...motionProps}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === "link" ? (
              <LinkScreen input={input} setInput={setInput} error={error} onSubmit={search} mode={mode} />
            ) : null}

            {step === "search" ? <SearchScreen input={input} /> : null}

            {step === "confirm" && trial ? (
              <ConfirmScreen trial={trial} onYes={() => go("missed")} onNo={notUs} />
            ) : null}

            {step === "missed" ? (
              <ChoiceScreen
                eyebrow={`About ${name}`}
                title="On a busy Friday night, how many calls go unanswered?"
                sub="Be honest. Nobody can cook, ring up the counter and answer the phone at once."
                options={MISSED_CALL_OPTIONS.map((o) => ({ id: o.id, label: o.label, detail: o.detail }))}
                value={missed}
                onPick={(id) => {
                  setMissed(id as MissedCallId);
                  setTimeout(() => go("ticket"), reduce ? 0 : 260);
                }}
              />
            ) : null}

            {step === "ticket" ? (
              <ChoiceScreen
                eyebrow="One more"
                title="What does a typical pickup order come to?"
                sub="A rough number is fine. We use it to show what missed calls cost you."
                options={TICKET_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                value={ticket}
                grid
                onPick={(id) => {
                  setTicket(id as TicketId);
                  setTimeout(() => go("insight"), reduce ? 0 : 260);
                }}
              />
            ) : null}

            {step === "insight" ? (
              <InsightScreen estimate={estimate} name={name} onNext={openMenu} />
            ) : null}

            {step === "menu" && trial ? (
              <MenuScreen
                trial={trial}
                ready={menuReady}
                busy={busy}
                error={error}
                onFix={fixMenu}
                onNext={() => go("pricing")}
              />
            ) : null}

            {step === "pricing" ? (
              <PricingScreen estimate={estimate} error={error} onNext={build} />
            ) : null}

            {step === "build" && trial ? <BuildScreen trial={trial} agentName={agentName} /> : null}

            {step === "meet" && trial ? (
              <MeetScreen
                trial={trial}
                mode={mode}
                busy={busy}
                error={error}
                onCallMe={() => go("contact")}
                onClaim={claim}
              />
            ) : null}

            {step === "contact" && trial ? (
              <ContactScreen
                agentName={agentName}
                busy={busy}
                error={error}
                fieldErrors={fieldErrors}
                onSubmit={submitLead}
              />
            ) : null}

            {step === "done" && trial ? (
              <DoneScreen trial={trial} callStatus={callStatus} phone={calledPhone} />
            ) : null}
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}

/* =================================== screens =================================== */

function LinkScreen({
  input,
  setInput,
  error,
  onSubmit,
  mode,
}: {
  input: string;
  setInput: (v: string) => void;
  error: string | null;
  onSubmit: (v: string) => void;
  mode: "public" | "dashboard";
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="sf__center">
      <p className="sf__eyebrow">{mode === "public" ? "Free · about 2 minutes · no sign-up" : "Let's set up your restaurant"}</p>
      <h1 className="sf__title">Where can we find your restaurant?</h1>
      <p className="sf__sub">Paste your website or Google Maps link. We&apos;ll read your menu, hours and details for you.</p>
      <form
        className="sf__link-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(input);
        }}
      >
        <label className="sr-only" htmlFor="sf-link">Restaurant website, Google Maps link, or name and city</label>
        <input
          id="sf-link"
          ref={ref}
          className="sf__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="yourrestaurant.com"
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
        />
        <button type="submit" className="btn-primary btn-lg sf__cta" disabled={!input.trim()}>
          Find my restaurant <Arrow />
        </button>
      </form>
      {error ? <p className="sf__error" role="alert">{error}</p> : null}
      <p className="sf__fine">Or type the name and city, like “Joe&apos;s Pizza, New York”. We only read public pages.</p>
    </div>
  );
}

function SearchScreen({ input }: { input: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, SEARCH_LINES.length - 1)), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="sf__center">
      <div className="sf__radar" aria-hidden>
        <span />
        <span />
        <span />
        <i />
      </div>
      <h1 className="sf__title sf__title--sm">Looking up your restaurant…</h1>
      <p className="sf__source">{input}</p>
      <ul className="sf__ticks" aria-live="polite">
        {SEARCH_LINES.map((line, n) => (
          <li key={line} className={cn("sf__tick", n < i && "is-done", n === i && "is-active")}>
            <TickIcon state={n < i ? "done" : n === i ? "active" : "idle"} />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfirmScreen({ trial, onYes, onNo }: { trial: TrialPublicView; onYes: () => void; onNo: () => void }) {
  const p = trial.profile;
  const address = [p?.address_line1, p?.city, p?.region].filter(Boolean).join(", ");
  const openDays = trial.hours?.filter((h) => !h.is_closed) ?? [];
  return (
    <div className="sf__center">
      <p className="sf__eyebrow sf__eyebrow--ok">
        <Check /> Found it
      </p>
      <h1 className="sf__title">Is this your restaurant?</h1>
      <div className="sf__place">
        <div className="sf__place-head">
          <span className="sf__place-avatar" aria-hidden>{(trial.restaurantName ?? "R").slice(0, 1)}</span>
          <div className="min-w-0">
            <p className="sf__place-name">{trial.restaurantName ?? "Your restaurant"}</p>
            <p className="sf__place-meta">{[p?.cuisine, p?.website?.replace(/^https?:\/\//, "").replace(/\/$/, "")].filter(Boolean).join(" · ") || trial.sourceInput}</p>
          </div>
        </div>
        <dl className="sf__place-facts">
          <Fact label="Address" value={address || "We'll ask for it later"} muted={!address} />
          <Fact label="Phone" value={p?.phone ?? "Not listed"} muted={!p?.phone} />
          <Fact
            label="Hours"
            value={
              openDays.length
                ? `Open ${openDays.length} days · ${DAY_SHORT[openDays[0].day_of_week]} ${openDays[0].open_time ?? ""}–${openDays[0].close_time ?? ""}`
                : "Not listed online"
            }
            muted={!openDays.length}
          />
          <Fact label="FAQs" value={trial.knowledge.length ? `${trial.knowledge.length} answers from your site` : "We'll add the basics"} muted={!trial.knowledge.length} />
        </dl>
      </div>
      <div className="sf__actions">
        <button type="button" className="btn-primary btn-lg sf__cta" onClick={onYes}>
          Yes, that&apos;s us <Arrow />
        </button>
        <button type="button" className="sf__text-btn" onClick={onNo}>
          Not quite
        </button>
      </div>
    </div>
  );
}

function ChoiceScreen({
  eyebrow,
  title,
  sub,
  options,
  value,
  onPick,
  grid = false,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  options: Array<{ id: string; label: string; detail?: string }>;
  value?: string;
  onPick: (id: string) => void;
  grid?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) onPick(options[n - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPick, options]);
  return (
    <div className="sf__center">
      <p className="sf__eyebrow">{eyebrow}</p>
      <h1 className="sf__title">{title}</h1>
      <p className="sf__sub">{sub}</p>
      <div className={cn("sf__options", grid && "sf__options--grid")} role="radiogroup" aria-label={title}>
        {options.map((o, n) => (
          <motion.button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            className={cn("sf__option", value === o.id && "is-picked")}
            onClick={() => onPick(o.id)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + n * 0.06, duration: 0.35 }}
          >
            <span className="sf__option-key" aria-hidden>{n + 1}</span>
            <span className="sf__option-text">
              <span className="sf__option-label">{o.label}</span>
              {o.detail ? <span className="sf__option-detail">{o.detail}</span> : null}
            </span>
            <span className="sf__option-check" aria-hidden><Check /></span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function InsightScreen({
  estimate,
  name,
  onNext,
}: {
  estimate: ReturnType<typeof estimateMissedRevenue>;
  name: string;
  onNext: () => void;
}) {
  const monthly = useCountUp(estimate.monthly);
  return (
    <div className="sf__center">
      <p className="sf__eyebrow sf__eyebrow--warn">Here&apos;s the hard part</p>
      <h1 className="sf__title">
        Missed calls could be costing {name} about{" "}
        <span className="sf__money">${monthly.toLocaleString()}</span> a month.
      </h1>
      <p className="sf__sub">
        Roughly {estimate.missedPerWeek} unanswered calls a week on busy nights. If even half wanted to order, that&apos;s{" "}
        {estimate.ordersPerWeek} orders a week going to someone else.
      </p>
      <ul className="sf__pains">
        {[
          ["Callers don't leave voicemails.", "Hungry people just call the next place on the map."],
          ["Rush hour is when it rings most.", "The busiest moments are the ones your team can least pick up."],
          ["The phone pulls staff off the floor.", "Guests at the counter wait while someone reads the menu aloud."],
        ].map(([a, b], n) => (
          <motion.li key={a} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + n * 0.15 }}>
            <span className="sf__pain-dot" aria-hidden />
            <span>
              <strong>{a}</strong> {b}
            </span>
          </motion.li>
        ))}
      </ul>
      <p className="sf__fine">Rough estimate from your answers: busy nights Thu–Sun, half of missed callers ordering.</p>
      <button type="button" className="btn-primary btn-lg sf__cta" onClick={onNext}>
        Show me how to fix it <Arrow />
      </button>
    </div>
  );
}

function MenuScreen({
  trial,
  ready,
  busy,
  error,
  onFix,
  onNext,
}: {
  trial: TrialPublicView;
  ready: boolean;
  busy: boolean;
  error: string | null;
  onFix: (p: { menu_url?: string } | FormData) => void;
  onNext: () => void;
}) {
  const [menuUrl, setMenuUrl] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const summary = trial.menuSummary;
  const isSample = !summary || summary.source === "sample";

  if (!ready || busy) {
    return (
      <div className="sf__center">
        <div className="sf__menu-skeleton" aria-hidden>
          {[0, 1, 2, 3, 4].map((n) => (
            <span key={n} style={{ animationDelay: `${n * 120}ms` }} />
          ))}
        </div>
        <h1 className="sf__title sf__title--sm">{busy ? "Reading that menu…" : "Reading your menu…"}</h1>
        <p className="sf__sub">Items, prices, sizes and add-ons. Almost there.</p>
      </div>
    );
  }

  return (
    <div className="sf__center">
      {isSample ? (
        <>
          <p className="sf__eyebrow sf__eyebrow--warn">No prices online</p>
          <h1 className="sf__title">We couldn&apos;t find a priced menu on your site.</h1>
          <p className="sf__sub">
            That&apos;s common. Snap a photo of your menu or paste your menu page, and we&apos;ll read every item and price.
            Or keep going with a sample menu and add yours later.
          </p>
          <div className="sf__menu-fix">
            <button type="button" className="btn-accent btn-lg sf__cta" onClick={() => fileRef.current?.click()}>
              Upload a menu photo
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
                onFix(fd);
                e.target.value = "";
              }}
            />
            <form
              className="sf__menu-url"
              onSubmit={(e) => {
                e.preventDefault();
                if (menuUrl.trim()) onFix({ menu_url: menuUrl.trim() });
              }}
            >
              <input className="sf__input sf__input--sm" placeholder="or paste your menu page link" value={menuUrl} onChange={(e) => setMenuUrl(e.target.value)} />
              <button type="submit" className="btn-ghost" disabled={!menuUrl.trim()}>Read</button>
            </form>
          </div>
          {error ? <p className="sf__error" role="alert">{error}</p> : null}
          <button type="button" className="sf__text-btn" onClick={onNext}>
            Continue with a sample menu
          </button>
        </>
      ) : (
        <>
          <p className="sf__eyebrow sf__eyebrow--ok">
            <Check /> Got your menu
          </p>
          <h1 className="sf__title">
            {summary.itemCount} items across {summary.categoryCount} categories.
          </h1>
          <p className="sf__sub">Your host will know every one of these, with prices, the moment a caller asks.</p>
          <ul className="sf__menu">
            {summary.sampleItems.slice(0, 6).map((item, n) => (
              <motion.li key={`${item.name}-${n}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + n * 0.08 }}>
                <span className="min-w-0">
                  <span className="sf__menu-name">{item.name}</span>
                  <span className="sf__menu-cat">{item.category}</span>
                </span>
                <span className="sf__menu-price">{item.price != null ? `$${item.price.toFixed(2)}` : "—"}</span>
              </motion.li>
            ))}
          </ul>
          {summary.itemCount > 6 ? <p className="sf__fine">+ {summary.itemCount - 6} more items</p> : null}
          <button type="button" className="btn-primary btn-lg sf__cta" onClick={onNext}>
            Looks right <Arrow />
          </button>
        </>
      )}
    </div>
  );
}

function PricingScreen({
  estimate,
  error,
  onNext,
}: {
  estimate: ReturnType<typeof estimateMissedRevenue>;
  error: string | null;
  onNext: () => void;
}) {
  return (
    <div className="sf__center">
      <p className="sf__eyebrow">Simple pricing</p>
      <h1 className="sf__title">
        You only pay when it brings you an order.
      </h1>
      <div className="sf__price">
        <p className="sf__price-amount">
          {PRICING_RATE_AMOUNT}
          <span>per completed order</span>
        </p>
        <ul className="sf__price-rows">
          <li><span>Monthly fee</span><strong>$0</strong></li>
          <li><span>Setup</span><strong>$0</strong></li>
          <li><span>Calls that don&apos;t become orders</span><strong>$0</strong></li>
          <li><span>Contract</span><strong>None</strong></li>
        </ul>
        <p className="sf__price-math">
          At your numbers: about <strong>${estimate.monthly.toLocaleString()}</strong> in recovered orders for about{" "}
          <strong>${estimate.roalMonthlyCost.toLocaleString()}</strong> a month.
        </p>
      </div>
      {error ? <p className="sf__error" role="alert">{error}</p> : null}
      <button type="button" className="btn-primary btn-lg sf__cta" onClick={onNext}>
        Build my phone host <Arrow />
      </button>
    </div>
  );
}

function BuildScreen({ trial, agentName }: { trial: TrialPublicView; agentName: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, BUILD_LINES.length)), 1000);
    return () => clearInterval(t);
  }, []);
  const pct = Math.round((i / BUILD_LINES.length) * 100);
  return (
    <div className="sf__center">
      <div className="sf__ring" style={{ "--pct": pct } as React.CSSProperties} aria-hidden>
        <span>{pct}%</span>
      </div>
      <h1 className="sf__title sf__title--sm">Training {agentName} on {trial.restaurantName ?? "your restaurant"}…</h1>
      <ul className="sf__ticks">
        {BUILD_LINES.map((line, n) => (
          <li key={line} className={cn("sf__tick", n < i && "is-done", n === i && "is-active")}>
            <TickIcon state={n < i ? "done" : n === i ? "active" : "idle"} />
            {n === 0 && trial.menuSummary
              ? trial.menuSummary.source === "sample"
                ? "Loading a starter menu"
                : `Learning ${trial.menuSummary.itemCount} menu items and prices`
              : n === 1 && !trial.hours
                ? "Setting up hours questions for your staff"
                : line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MeetScreen({
  trial,
  mode,
  busy,
  error,
  onCallMe,
  onClaim,
}: {
  trial: TrialPublicView;
  mode: "public" | "dashboard";
  busy: boolean;
  error: string | null;
  onCallMe: () => void;
  onClaim: () => void;
}) {
  const persona = trial.persona;
  const greeting = useTypewriter(trial.greeting ?? `Hi, thanks for calling ${trial.restaurantName}. What can I get for you?`);
  const [testing, setTesting] = useState(false);
  return (
    <div className="sf__center">
      <div className="sf__host" aria-hidden>
        <span className="sf__host-wave" />
        <span className="sf__host-wave" />
        <span className="sf__host-avatar">{persona.agentName.slice(0, 1)}</span>
      </div>
      <p className="sf__eyebrow sf__eyebrow--ok">
        <Check /> Ready
      </p>
      <h1 className="sf__title">Meet {persona.agentName}, your new phone host.</h1>
      <div className="sf__bubble">
        <p className="sf__bubble-who">{persona.agentName} · {persona.voiceLabel} voice</p>
        <p className="sf__bubble-text">“{greeting}”</p>
      </div>
      <p className="sf__sub">
        {persona.agentName} knows{" "}
        {trial.menuSummary && trial.menuSummary.source !== "sample" ? `your ${trial.menuSummary.itemCount} menu items` : "a starter menu"}
        {trial.hours ? ", your hours" : ""}
        {trial.knowledge.length ? " and your FAQs" : ""}, and takes pickup orders straight to your kitchen.
      </p>
      {error ? <p className="sf__error" role="alert">{error}</p> : null}
      {mode === "public" ? (
        <div className="sf__actions">
          <button type="button" className="btn-accent btn-lg sf__cta" onClick={onCallMe}>
            Have {persona.agentName} call me <Arrow />
          </button>
        </div>
      ) : (
        <div className="sf__actions">
          <button type="button" className="btn-accent btn-lg sf__cta" onClick={onClaim} disabled={busy}>
            {busy ? "Setting up your restaurant…" : `Keep ${persona.agentName} & open my dashboard`}
          </button>
          <button type="button" className="sf__text-btn" onClick={() => setTesting((v) => !v)}>
            {testing ? "Hide test call" : "Test it in my browser first"}
          </button>
        </div>
      )}
      {testing ? (
        <div className="sf__call">
          <TrialCall trialId={trial.id} agentName={persona.agentName} restaurantName={trial.restaurantName ?? "your restaurant"} compact />
        </div>
      ) : null}
    </div>
  );
}

function ContactScreen({
  agentName,
  busy,
  error,
  fieldErrors,
  onSubmit,
}: {
  agentName: string;
  busy: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  onSubmit: (form: { name: string; phone: string; email: string }) => void;
}) {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="sf__center">
      <p className="sf__eyebrow">Last step</p>
      <h1 className="sf__title">Where should {agentName} call you?</h1>
      <p className="sf__sub">Pretend you&apos;re a customer. Order something, ask about hours, change your mind.</p>
      <form
        className="sf__contact"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
        noValidate
      >
        <Field id="sf-name" label="Your name" value={form.name} onChange={set("name")} autoComplete="name" error={fieldErrors.name} autoFocus />
        <Field id="sf-phone" label="Mobile number" value={form.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" placeholder="(512) 555-0199" error={fieldErrors.phone} />
        <Field id="sf-email" label="Email" value={form.email} onChange={set("email")} autoComplete="email" inputMode="email" placeholder="you@restaurant.com" error={fieldErrors.email} />
        {error && !Object.keys(fieldErrors).length ? <p className="sf__error" role="alert">{error}</p> : null}
        <button type="submit" className="btn-accent btn-lg sf__cta" disabled={busy}>
          {busy ? "Sending…" : `Call me now`} {!busy ? <Arrow /> : null}
        </button>
        <p className="sf__fine">
          By tapping Call me now, you agree to one demo call from ROAL&apos;s AI host at this number and to emails about your
          setup. No spam, ever.
        </p>
      </form>
    </div>
  );
}

function DoneScreen({ trial, callStatus, phone }: { trial: TrialPublicView; callStatus: CallStatus | null; phone: string | null }) {
  const agentName = trial.persona.agentName;
  const placed = callStatus === "placed";
  return (
    <div className="sf__center">
      <div className={cn("sf__phone", placed && "is-ringing")} aria-hidden>
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" /></svg>
      </div>
      {placed ? (
        <>
          <h1 className="sf__title">{agentName} is calling you now.</h1>
          <p className="sf__sub">Pick up {phone ? <strong>{formatPhone(phone)}</strong> : "your phone"} and order like a customer would.</p>
        </>
      ) : (
        <>
          <h1 className="sf__title">You&apos;re in. Talk to {agentName} right now.</h1>
          <p className="sf__sub">
            We saved your details{phone ? <> and will be in touch at <strong>{formatPhone(phone)}</strong></> : null}. No need to wait: call {agentName} from your browser below.
          </p>
          <div className="sf__call">
            <TrialCall trialId={trial.id} agentName={agentName} restaurantName={trial.restaurantName ?? "your restaurant"} compact />
          </div>
        </>
      )}
      <div className="sf__keep">
        <p className="sf__keep-title">Keep {agentName} for {trial.restaurantName ?? "your restaurant"}</p>
        <p className="sf__keep-body">Create a free account and we&apos;ll save your menu, hours and voice. You pay {PRICING_RATE_AMOUNT} only when an order comes in.</p>
        <Link href="/signup?next=%2Fdashboard%2Fonboarding" className="btn-primary btn-lg sf__cta">
          Create my free account <Arrow />
        </Link>
      </div>
    </div>
  );
}

/* =================================== bits =================================== */

function Field({
  id,
  label,
  error,
  ...rest
}: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("sf__field", error && "has-error")}>
      <label htmlFor={id}>{label}</label>
      <input id={id} className="sf__input sf__input--sm" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} {...rest} />
      {error ? <p id={`${id}-err`} className="sf__field-error">{error}</p> : null}
    </div>
  );
}

function Fact({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="sf__fact">
      <dt>{label}</dt>
      <dd className={cn(muted && "is-muted")}>{value}</dd>
    </div>
  );
}

function TickIcon({ state }: { state: "done" | "active" | "idle" }) {
  return (
    <span className={cn("sf__tick-icon", `is-${state}`)} aria-hidden>
      {state === "done" ? <Check /> : state === "active" ? <span className="sf__spinner" /> : null}
    </span>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4 4L19 7" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h13m-5-5 5 5-5 5" />
    </svg>
  );
}

function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return e164;
}

function useCountUp(target: number, ms = 1200): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ms, target]);
  return v;
}

function useTypewriter(text: string, cps = 38): string {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const t = setInterval(() => setN((k) => (k >= text.length ? k : k + 1)), 1000 / cps);
    return () => clearInterval(t);
  }, [cps, text]);
  return text.slice(0, n);
}
