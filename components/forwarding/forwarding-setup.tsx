"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Copy,
  Globe,
  Headphones,
  HelpCircle,
  Phone,
  PhoneCall,
  PhoneForwarded,
  Printer,
  RotateCcw,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  CARRIERS,
  FORWARDING_MODES,
  forwardingInstructions,
  type CarrierId,
  type ForwardingMode,
} from "@/lib/forwarding/carriers";
import type { ForwardingSummary, ForwardingTestResult } from "@/lib/forwarding/state";
import { formatPhoneForDisplay } from "@/lib/phone/e164";

type Step = "intro" | "carrier" | "mode" | "dial" | "test" | "done";
const STEPS: Step[] = ["intro", "carrier", "mode", "dial", "test", "done"];
const EASE = [0.22, 1, 0.36, 1] as const;

const CARRIER_ICONS: Record<CarrierId, typeof Phone> = {
  landline: Phone,
  gsm_mobile: Smartphone,
  verizon_wireless: Smartphone,
  comcast_business: Building2,
  spectrum_business: Building2,
  ringcentral: Headphones,
  ooma: Headphones,
  other_voip: HelpCircle,
};

type TestState =
  | { phase: "idle" }
  | { phase: "calling"; startedAt: number }
  | { phase: "result"; result: ForwardingTestResult }
  | { phase: "error"; message: string };

/** Guided, animated call-forwarding setup with a live check from ROAL's side. */
export function ForwardingSetup({
  restaurantId,
  restaurantName,
  hostName,
  initial,
}: {
  restaurantId: string;
  restaurantName: string;
  hostName: string;
  initial: ForwardingSummary;
}) {
  const reduce = useReducedMotion();
  const [summary, setSummary] = useState(initial);
  const [step, setStep] = useState<Step>(initial.status === "on" ? "done" : "intro");
  const [direction, setDirection] = useState(1);
  const [carrier, setCarrier] = useState<CarrierId | null>(initial.carrier);
  const [mode, setMode] = useState<ForwardingMode>(initial.mode);
  const [test, setTest] = useState<TestState>({ phase: "idle" });

  const roal = summary.roalPhone;
  const roalPretty = formatPhoneForDisplay(roal) ?? roal;
  const storePretty = formatPhoneForDisplay(summary.storePhone) ?? summary.storePhone;
  const instructions = useMemo(
    () => (carrier && roal ? forwardingInstructions(carrier, mode, roal) : null),
    [carrier, mode, roal]
  );
  const api = `/api/restaurants/${restaurantId}/forwarding`;

  const go = useCallback((next: Step) => {
    setDirection(STEPS.indexOf(next) >= STEPS.indexOf(step) ? 1 : -1);
    setStep(next);
  }, [step]);

  const save = useCallback(
    async (patch: { carrier?: CarrierId; mode?: ForwardingMode }) => {
      const res = await fetch(api, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) }).catch(() => null);
      if (res?.ok) setSummary((await res.json()) as ForwardingSummary);
    },
    [api]
  );

  // Poll a running test call.
  const polling = useRef(false);
  useEffect(() => {
    if (test.phase !== "calling" || polling.current) return;
    polling.current = true;
    let cancelled = false;
    const tick = async () => {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 2500));
        if (cancelled) break;
        const res = await fetch(`${api}/test`, { cache: "no-store" }).catch(() => null);
        const body = res?.ok ? ((await res.json()) as { done: boolean; result?: ForwardingTestResult; forwarding?: ForwardingSummary }) : null;
        if (body?.done && body.result) {
          if (body.forwarding) setSummary(body.forwarding);
          setTest({ phase: "result", result: body.result });
          break;
        }
      }
      polling.current = false;
    };
    void tick();
    return () => {
      cancelled = true;
      polling.current = false;
    };
  }, [test.phase, api]);

  const startTest = async () => {
    setTest({ phase: "calling", startedAt: Date.now() });
    const res = await fetch(`${api}/test`, { method: "POST" }).catch(() => null);
    if (!res?.ok) {
      const body = (await res?.json().catch(() => null)) as { error?: string } | null;
      setTest({ phase: "error", message: body?.error ?? "We couldn't place the test call. Try again in a minute." });
    }
  };

  const stepIndex = STEPS.indexOf(step);
  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: direction * 40 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: direction * -40 },
      };

  if (!roal) {
    return (
      <Shell>
        <div className="p-6 text-center sm:p-10">
          <FloatingIcon icon={PhoneForwarded} reduce={Boolean(reduce)} />
          <h2 className="mt-5 font-display text-[22px] font-semibold text-ink">Your phone line is on its way</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-muted">
            We give {restaurantName} its own phone line when your plan starts. Once it&apos;s ready, come back here and we&apos;ll
            walk you through sending your calls to {hostName}. It takes about two minutes.
          </p>
          <Link href={`/dashboard/restaurants/${restaurantId}/billing`} className="btn-primary mt-6 inline-flex">
            Start your plan
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {step !== "intro" ? (
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
          {step !== "done" ? (
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-elev"
              onClick={() => go(STEPS[Math.max(0, stepIndex - 1)])}
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
          ) : null}
          <ol className="flex flex-1 items-center gap-1.5" aria-label={`Step ${stepIndex} of ${STEPS.length - 1}`}>
            {STEPS.slice(1).map((s, i) => (
              <li key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-elev">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={false}
                  animate={{ width: i < stepIndex ? "100%" : "0%" }}
                  transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
                />
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div key={step} {...slide} transition={{ duration: reduce ? 0.15 : 0.3, ease: EASE }} className="p-5 sm:p-8">
            {step === "intro" ? (
              <div className="text-center">
                <CallFlow reduce={Boolean(reduce)} storeLabel={storePretty ?? "Your number"} hostName={hostName} />
                <h2 className="mt-6 font-display text-[24px] font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
                  Send your calls to {hostName}
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-[14.5px] text-muted">
                  Customers keep calling {storePretty ?? "your usual number"}. You turn on call forwarding once, and calls
                  you can&apos;t get to go to {hostName}. Two minutes, no new equipment.
                </p>
                <button type="button" className="btn-primary mt-7 inline-flex items-center gap-2" onClick={() => go("carrier")}>
                  Let&apos;s do it <ArrowRight size={16} />
                </button>
              </div>
            ) : null}

            {step === "carrier" ? (
              <div>
                <StepTitle title="What kind of phone is your store number on?" subtitle="Pick the closest one. You can change it later." />
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {CARRIERS.map((c, i) => {
                    const Icon = CARRIER_ICONS[c.id];
                    const active = carrier === c.id;
                    return (
                      <motion.button
                        key={c.id}
                        type="button"
                        initial={reduce ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: reduce ? 0 : 0.04 * i, duration: 0.35, ease: EASE }}
                        whileHover={reduce ? undefined : { y: -2 }}
                        whileTap={reduce ? undefined : { scale: 0.98 }}
                        onClick={() => {
                          setCarrier(c.id);
                          void save({ carrier: c.id });
                          go("mode");
                        }}
                        className={cn(
                          "flex min-h-[64px] items-center gap-3 rounded-[14px] border bg-card p-3.5 text-left transition-colors",
                          active ? "border-accent bg-accent-soft/40" : "border-line hover:border-line-strong"
                        )}
                      >
                        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-[10px]", active ? "bg-accent text-white" : "bg-elev text-muted")}>
                          {c.kind === "portal" && c.id !== "other_voip" ? <Globe size={18} /> : <Icon size={18} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold text-ink">{c.label}</span>
                          <span className="block truncate text-[12.5px] text-subtle">{c.hint}</span>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step === "mode" ? (
              <div>
                <StepTitle title={`When should ${hostName} answer?`} subtitle="Most restaurants start with the first one." />
                <div className="mt-5 grid gap-3">
                  {FORWARDING_MODES.map((m, i) => {
                    const active = mode === m.id;
                    return (
                      <motion.button
                        key={m.id}
                        type="button"
                        initial={reduce ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: reduce ? 0 : 0.08 * i, duration: 0.35, ease: EASE }}
                        whileTap={reduce ? undefined : { scale: 0.99 }}
                        onClick={() => setMode(m.id)}
                        className={cn(
                          "relative flex items-start gap-3 rounded-[14px] border p-4 text-left transition-colors",
                          active ? "border-accent bg-accent-soft/40" : "border-line bg-card hover:border-line-strong"
                        )}
                      >
                        <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", active ? "border-accent" : "border-line-strong")}>
                          <AnimatePresence>
                            {active ? (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="h-2.5 w-2.5 rounded-full bg-accent"
                              />
                            ) : null}
                          </AnimatePresence>
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-ink">
                            {m.label}
                            {m.recommended ? (
                              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">Recommended</span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-[13px] text-muted">{m.detail}</span>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="btn-primary inline-flex items-center gap-2"
                    onClick={() => {
                      void save({ mode });
                      go("dial");
                    }}
                  >
                    Show me what to do <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}

            {step === "dial" && instructions ? (
              <div>
                <StepTitle
                  title={instructions.carrier.kind === "dial" ? "Dial this from the store phone" : `Turn it on in ${instructions.carrier.label}`}
                  subtitle={`Your ROAL line is ${roalPretty}. Calls forwarded there reach ${hostName}.`}
                />
                <div className="mt-5 space-y-3">
                  {instructions.steps.map((s, i) => (
                    <motion.div
                      key={`${s.label}-${i}`}
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: reduce ? 0 : 0.12 * i, duration: 0.35, ease: EASE }}
                      className="rounded-[14px] border border-line bg-card p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-[12px] font-bold text-white">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] text-ink">{s.label}</p>
                          {s.code ? <DialCode code={s.code} reduce={Boolean(reduce)} delay={0.15 + 0.12 * i} dialable={instructions.carrier.kind === "dial"} /> : null}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {instructions.note ? <p className="mt-3 text-[12.5px] text-subtle">{instructions.note}</p> : null}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" className="btn-primary inline-flex items-center justify-center gap-2" onClick={() => go("test")}>
                    I did it. Check it <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}

            {step === "test" ? (
              <TestScreen
                test={test}
                reduce={Boolean(reduce)}
                mode={mode}
                hostName={hostName}
                storePretty={storePretty}
                onStart={startTest}
                onRetryDial={() => {
                  setTest({ phase: "idle" });
                  go("dial");
                }}
                onRetry={() => setTest({ phase: "idle" })}
                onDone={() => go("done")}
              />
            ) : null}

            {step === "done" ? (
              <DoneScreen
                reduce={Boolean(reduce)}
                hostName={hostName}
                restaurantName={restaurantName}
                storePretty={storePretty}
                cancel={instructions?.cancel ?? (carrier && roal ? forwardingInstructions(carrier, mode, roal).cancel : [])}
                verified={summary.status === "on"}
                onRecheck={() => {
                  setTest({ phase: "idle" });
                  go("test");
                }}
                onChange={() => go("carrier")}
                overviewHref={`/dashboard/restaurants/${restaurantId}/overview`}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <section className="panel mx-auto w-full max-w-[720px] overflow-hidden">{children}</section>;
}

function StepTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="font-display text-[20px] font-semibold tracking-[-0.015em] text-ink sm:text-[22px]">{title}</h2>
      {subtitle ? <p className="mt-1 text-[13.5px] text-muted">{subtitle}</p> : null}
    </div>
  );
}

function FloatingIcon({ icon: Icon, reduce }: { icon: typeof Phone; reduce: boolean }) {
  return (
    <motion.div
      className="mx-auto grid h-16 w-16 place-items-center rounded-[18px] bg-accent-soft text-accent"
      animate={reduce ? undefined : { y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <Icon size={28} />
    </motion.div>
  );
}

/** Customer → store number → host, with a call pulse travelling along the line. */
function CallFlow({ reduce, storeLabel, hostName }: { reduce: boolean; storeLabel: string; hostName: string }) {
  const nodes = [
    { icon: Smartphone, label: "Customer" },
    { icon: Phone, label: storeLabel },
    { icon: Sparkles, label: hostName },
  ];
  return (
    <div className="mx-auto flex max-w-md items-center justify-between gap-1 pt-2">
      {nodes.map((n, i) => (
        <div key={n.label} className="contents">
          <motion.div
            className="flex w-20 flex-col items-center gap-1.5"
            initial={reduce ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: reduce ? 0 : 0.15 * i, type: "spring", stiffness: 260, damping: 20 }}
          >
            <span className={cn("relative grid h-14 w-14 place-items-center rounded-[16px]", i === 2 ? "bg-accent text-white" : "bg-elev text-ink")}>
              {i === 2 && !reduce ? (
                <motion.span
                  className="absolute inset-0 rounded-[16px] bg-accent"
                  animate={{ scale: [1, 1.35], opacity: [0.35, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 1 }}
                />
              ) : null}
              <n.icon size={22} className="relative" />
            </span>
            <span className="max-w-[88px] truncate text-[11.5px] font-medium text-muted">{n.label}</span>
          </motion.div>
          {i < nodes.length - 1 ? (
            <div className="relative mb-6 h-[2px] flex-1 overflow-hidden rounded-full bg-line">
              {!reduce ? (
                <motion.span
                  className="absolute top-0 h-full w-8 rounded-full bg-accent"
                  animate={{ left: ["-30%", "110%"] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.7, repeatDelay: 0.7 }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** The code to dial, typed out key by key, with copy and tap-to-dial. */
function DialCode({ code, reduce, delay, dialable }: { code: string; reduce: boolean; delay: number; dialable: boolean }) {
  const [copied, setCopied] = useState(false);
  const chars = code.split("");
  const telHref = `tel:${code.replace(/[^\d*#+]/g, "").replace(/#/g, "%23")}`;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      <div className="flex min-h-[48px] flex-wrap items-center rounded-[12px] bg-ink px-4 py-2 font-mono text-[22px] font-semibold tracking-[0.06em] text-white sm:text-[26px]" aria-label={code}>
        {chars.map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : delay + i * 0.045, duration: 0.18 }}
          >
            {ch}
          </motion.span>
        ))}
        {!reduce ? (
          <motion.span
            aria-hidden
            className="ml-0.5 inline-block h-6 w-[2px] bg-white/70"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        ) : null}
      </div>
      <button
        type="button"
        className="btn-ghost btn-sm inline-flex items-center gap-1.5"
        onClick={() => {
          void navigator.clipboard?.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          });
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={copied ? "ok" : "copy"} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          </motion.span>
        </AnimatePresence>
        {copied ? "Copied" : "Copy"}
      </button>
      {dialable ? (
        <a href={telHref} className="btn-ghost btn-sm inline-flex items-center gap-1.5 sm:hidden">
          <PhoneCall size={14} /> Dial
        </a>
      ) : null}
    </div>
  );
}

function TestScreen({
  test,
  reduce,
  mode,
  hostName,
  storePretty,
  onStart,
  onRetry,
  onRetryDial,
  onDone,
}: {
  test: TestState;
  reduce: boolean;
  mode: ForwardingMode;
  hostName: string;
  storePretty: string | null;
  onStart: () => void;
  onRetry: () => void;
  onRetryDial: () => void;
  onDone: () => void;
}) {
  if (test.phase === "result" && test.result === "forwarded") {
    return (
      <div className="py-4 text-center">
        <SuccessBurst reduce={reduce} />
        <h2 className="mt-5 font-display text-[24px] font-semibold text-ink">Forwarding works</h2>
        <p className="mx-auto mt-1.5 max-w-md text-[14px] text-muted">
          We called {storePretty ?? "your store number"} and it came straight through to {hostName}. You&apos;re all set.
        </p>
        <button type="button" className="btn-primary mt-6 inline-flex items-center gap-2" onClick={onDone}>
          Finish <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  if (test.phase === "result" || test.phase === "error") {
    const answered = test.phase === "result" && test.result === "answered_at_store";
    const title = test.phase === "error" ? "We couldn't run the check" : answered ? "Someone picked up at the store" : "The call didn't come through yet";
    const body =
      test.phase === "error"
        ? test.message
        : answered
          ? "The test call was answered at your store (or by voicemail), so it never reached your host. Try again and let it ring without answering."
          : "Forwarding doesn't look on yet. Double-check the code was dialed from the store phone, then try again. Some phone companies take a minute to switch it on.";
    return (
      <div className="py-4 text-center">
        <motion.div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-warning/15 text-warning"
          initial={reduce ? false : { scale: 0.6, rotate: -8 }}
          animate={reduce ? undefined : { scale: 1, rotate: [0, -6, 6, -3, 0] }}
          transition={{ duration: 0.6 }}
        >
          {answered ? <Phone size={26} /> : <X size={26} />}
        </motion.div>
        <h2 className="mt-5 font-display text-[22px] font-semibold text-ink">{title}</h2>
        <p className="mx-auto mt-1.5 max-w-md text-[14px] text-muted">{body}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={onRetry}>
            <RotateCcw size={15} /> Try again
          </button>
          <button type="button" className="btn-ghost" onClick={onRetryDial}>
            See the steps again
          </button>
        </div>
      </div>
    );
  }

  const calling = test.phase === "calling";
  return (
    <div className="py-2 text-center">
      <RingingPhone active={calling} reduce={reduce} />
      <h2 className="mt-6 font-display text-[22px] font-semibold text-ink">{calling ? "Calling your store…" : "Let's check it works"}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-[14px] text-muted">
        {calling
          ? mode === "backup"
            ? "Let it ring. Don't answer. After a few rings it should come through to your host. This takes up to a minute."
            : "Don't answer. If forwarding is on, the call comes straight through to your host."
          : `We'll call ${storePretty ?? "your store number"} from your ROAL line and watch for it to arrive. Please don't pick up.`}
      </p>
      {calling ? (
        <CallingSteps startedAt={test.startedAt} reduce={reduce} />
      ) : (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={onStart}>
            <PhoneCall size={16} /> Call my store to check
          </button>
          <button type="button" className="text-[12.5px] text-subtle underline-offset-2 hover:underline" onClick={onDone}>
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}

function RingingPhone({ active, reduce }: { active: boolean; reduce: boolean }) {
  return (
    <div className="relative mx-auto grid h-24 w-24 place-items-center">
      {active && !reduce
        ? [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border-2 border-accent"
              initial={{ scale: 0.7, opacity: 0.6 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
            />
          ))
        : null}
      <motion.span
        className="relative grid h-20 w-20 place-items-center rounded-full bg-accent text-white shadow-lg"
        animate={active && !reduce ? { rotate: [0, -14, 14, -10, 10, 0] } : undefined}
        transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 0.9 }}
      >
        <PhoneCall size={32} />
      </motion.span>
    </div>
  );
}

function CallingSteps({ startedAt, reduce }: { startedAt: number; reduce: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const s = (now - startedAt) / 1000;
  const items = [
    { label: "Calling your store number", done: s > 4 },
    { label: "Waiting for it to forward", done: false, active: s > 4 },
  ];
  return (
    <ul className="mx-auto mt-6 max-w-xs space-y-2 text-left">
      {items.map((it) => (
        <motion.li
          key={it.label}
          initial={reduce ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2.5 text-[13.5px]"
        >
          <span className={cn("grid h-5 w-5 place-items-center rounded-full", it.done ? "bg-success text-white" : "bg-elev")}>
            {it.done ? (
              <Check size={12} strokeWidth={3} />
            ) : (
              <motion.span
                className="h-2 w-2 rounded-full bg-accent"
                animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
          </span>
          <span className={it.done || it.active ? "text-ink" : "text-subtle"}>{it.label}</span>
        </motion.li>
      ))}
      <li className="pl-7 text-[12px] text-subtle">{Math.floor(s)}s</li>
    </ul>
  );
}

function SuccessBurst({ reduce }: { reduce: boolean }) {
  const dots = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div className="relative mx-auto grid h-24 w-24 place-items-center">
      {!reduce
        ? dots.map((i) => {
            const angle = (i / dots.length) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                className={cn("absolute h-2 w-2 rounded-full", i % 3 === 0 ? "bg-accent" : i % 3 === 1 ? "bg-success" : "bg-warning")}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(angle) * 56, y: Math.sin(angle) * 56, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
              />
            );
          })
        : null}
      <motion.span
        className="grid h-20 w-20 place-items-center rounded-full bg-success text-white"
        initial={reduce ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <motion.svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.25 }}
          />
        </motion.svg>
      </motion.span>
    </div>
  );
}

function DoneScreen({
  reduce,
  hostName,
  restaurantName,
  storePretty,
  cancel,
  verified,
  onRecheck,
  onChange,
  overviewHref,
}: {
  reduce: boolean;
  hostName: string;
  restaurantName: string;
  storePretty: string | null;
  cancel: Array<{ label: string; code?: string }>;
  verified: boolean;
  onRecheck: () => void;
  onChange: () => void;
  overviewHref: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <motion.span
          className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full text-white", verified ? "bg-success" : "bg-accent")}
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
        >
          {verified ? <Check size={20} strokeWidth={3} /> : <PhoneForwarded size={20} />}
        </motion.span>
        <StepTitle
          title={verified ? "Forwarding is on" : "Forwarding is set up"}
          subtitle={
            verified
              ? `Calls to ${storePretty ?? "your number"} reach ${hostName}. We check every day and tell you if calls stop coming through.`
              : "Run the check any time to confirm calls reach your host."
          }
        />
      </div>

      {cancel.length ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
          className="forwarding-sticker mt-6 rounded-[14px] border-2 border-dashed border-line-strong bg-card p-4"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">Keep this by the phone</p>
          <p className="mt-1 text-[14px] font-semibold text-ink">{restaurantName}: turn off call forwarding</p>
          <ul className="mt-2 space-y-1.5">
            {cancel.map((c, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                {c.label}
                {c.code ? <span className="rounded-[8px] bg-ink px-2 py-0.5 font-mono text-[15px] font-semibold text-white">{c.code}</span> : null}
              </li>
            ))}
          </ul>
          <button type="button" className="btn-ghost btn-sm mt-3 inline-flex items-center gap-1.5 print:hidden" onClick={() => window.print()}>
            <Printer size={14} /> Print this
          </button>
        </motion.div>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex gap-2">
          <button type="button" className="btn-ghost btn-sm inline-flex items-center gap-1.5" onClick={onRecheck}>
            <PhoneCall size={14} /> Test my forwarding
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={onChange}>
            Change setup
          </button>
        </div>
        <Link href={overviewHref} className="btn-primary inline-flex items-center justify-center gap-2">
          Back to dashboard <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
