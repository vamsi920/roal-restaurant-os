"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { setWizardStepStatusAction } from "@/app/dashboard/onboarding/actions";
import { Panel, StatusChip } from "@/components/dashboard/page-primitives";
import { OnboardingReadinessPanel } from "@/components/onboarding/OnboardingReadinessPanel";
import { OnboardingTryCall } from "@/components/onboarding/onboarding-try-call";
import { OnboardingVoiceAgentStep } from "@/components/onboarding/onboarding-voice-agent-step";
import { LaunchCheckMark } from "@/components/restaurant-launch/RestaurantLaunchChecklist";
import { cn } from "@/lib/cn";
import { formatSupabaseClientError } from "@/lib/dashboard/format-user-error";
import {
  RESTAURANT_LIVE_ORDERS_LABEL,
  RESTAURANT_MENU_SETUP_TITLE,
} from "@/lib/dashboard-restaurant-labels";
import { CONTACT_PILOT_EMAIL, buildPilotMailto } from "@/lib/landing/contact-mailto";
import type { OnboardingStepStatus } from "@/lib/onboarding/types";
import type { OnboardingWizardState } from "@/lib/onboarding/wizard-types";
import {
  restaurantLiveOrdersHref,
  restaurantMenuSetupHref,
  restaurantVoiceAgentHref,
} from "@/lib/voice-agent/provision-display";

type Props = {
  initialState: OnboardingWizardState;
};

type GoLiveStepId = "menu" | "hours" | "host" | "test_call" | "forward";

type GoLiveStep = {
  id: GoLiveStepId;
  label: string;
  detail: string;
  done: boolean;
  error?: boolean;
  /** External link for steps that live in the workspace. */
  href?: string;
  hrefLabel?: string;
};

function restaurantStepStatus(
  state: OnboardingWizardState,
  key: "voice_agent" | "test_call" | "go_live"
): OnboardingStepStatus {
  return state.restaurantOnboarding?.steps[key]?.status ?? "pending";
}

function buildSteps(state: OnboardingWizardState): GoLiveStep[] {
  const restaurant = state.activeRestaurant;
  if (!restaurant) return [];
  const menuHref = restaurantMenuSetupHref(restaurant.id);
  const voice = state.activeRestaurantVoice;
  const hostReady = Boolean(voice && voice.uiState === "ready" && voice.toolsSynced);
  const hostError = voice?.uiState === "needs_attention";
  const checklistTestCall = state.launchChecklist?.items.find((i) => i.id === "test_call_passed");
  const testCallStatus = restaurantStepStatus(state, "test_call");
  const testCallDone =
    checklistTestCall?.status === "ok" ||
    testCallStatus === "completed" ||
    testCallStatus === "skipped";
  const forwarded = restaurantStepStatus(state, "go_live") === "completed";

  return [
    {
      id: "menu",
      label: "Menu loaded",
      detail:
        state.menuItemCount > 0
          ? `${state.menuItemCount} item${state.menuItemCount === 1 ? "" : "s"} in ${state.menuCategoryCount} categor${state.menuCategoryCount === 1 ? "y" : "ies"}`
          : "Scan a menu photo or paste a link so the host knows what to sell.",
      done: state.menuItemCount > 0,
      href: menuHref,
      hrefLabel: RESTAURANT_MENU_SETUP_TITLE,
    },
    {
      id: "hours",
      label: "Hours set",
      detail: state.hoursConfigured
        ? "Weekly hours saved — the host tells callers when you're closed."
        : "Add weekly hours so the host never takes an order you can't make.",
      done: state.hoursConfigured,
      href: menuHref,
      hrefLabel: "Set hours",
    },
    {
      id: "host",
      label: "Phone host provisioned",
      detail: hostReady
        ? "Dedicated agent is live with your menu tools."
        : hostError
          ? voice?.provisionError ?? voice?.lastSyncError ?? "Setup did not finish."
          : voice?.uiState === "in_progress"
            ? "Building the agent now."
            : voice?.agentId
              ? "Agent linked — sync the menu tools."
              : "ROAL builds a dedicated ElevenLabs agent for this location.",
      done: hostReady,
      error: hostError,
    },
    {
      id: "test_call",
      label: "Test call passed",
      detail: testCallDone
        ? testCallStatus === "skipped"
          ? "Skipped — you can still test any time."
          : "Order placed and seen on Live orders."
        : "Call the host from your browser and place a sample order.",
      done: testCallDone,
    },
    {
      id: "forward",
      label: "Forward your number",
      detail: forwarded
        ? "Guests who call the restaurant reach the host."
        : "Point your existing phone line at the host. Takes one minute with your carrier.",
      done: forwarded,
    },
  ];
}

export function OnboardingWizard({ initialState }: Props) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [focused, setFocused] = useState<GoLiveStepId | null>(null);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  const orgId = state.organization?.id ?? null;
  const restaurant = state.activeRestaurant;
  const restaurantId = restaurant?.id ?? null;

  const steps = useMemo(() => buildSteps(state), [state]);
  const doneCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done) ?? null;
  const allDone = steps.length > 0 && !nextStep;
  const activeId: GoLiveStepId | null = focused ?? nextStep?.id ?? null;

  const run = useCallback(
    (fn: () => Promise<void>) => {
      setError(null);
      startTransition(async () => {
        try {
          await fn();
          router.refresh();
        } catch (e) {
          setError(
            formatSupabaseClientError(e instanceof Error ? e.message : "Something went wrong.")
          );
        }
      });
    },
    [router]
  );

  const setStep = useCallback(
    (step: "voice_agent" | "test_call" | "go_live", status: OnboardingStepStatus) => {
      if (!orgId || !restaurantId) return;
      run(async () => {
        await setWizardStepStatusAction({
          scope: "restaurant",
          organizationId: orgId,
          restaurantId,
          step,
          status,
        });
        setFocused(null);
      });
    },
    [orgId, restaurantId, run]
  );

  if (!restaurant || !restaurantId || !orgId) {
    return (
      <div className="onboarding-page dashboard-page dashboard-page--narrow">
        <Panel title="No location selected">
          <p className="mt-2 text-[13px] text-muted">
            Pick a location to see its go-live checklist.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/dashboard/restaurants" className="btn-primary">
              Locations
            </Link>
            <Link href="/dashboard/onboarding?new=1" className="btn-ghost">
              Add location
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  const ordersHref = restaurantLiveOrdersHref(restaurantId);
  const menuHref = restaurantMenuSetupHref(restaurantId);
  const hostHref = restaurantVoiceAgentHref(restaurantId);

  return (
    <div className="onboarding-page dashboard-page dashboard-page--wide min-w-0 space-y-5 overflow-x-hidden">
      <header className="dashboard-page__header">
        <div className="min-w-0">
          {state.restaurants.length > 1 ? (
            <label className="dashboard-page__eyebrow flex items-center gap-1.5">
              <span>Location</span>
              <select
                className="input-base h-7 w-auto max-w-[16rem] py-0 pl-2 pr-7 text-[12px] font-semibold uppercase tracking-wider"
                value={restaurantId}
                onChange={(e) => router.push(`/dashboard/onboarding?restaurant=${e.target.value}`)}
                aria-label="Switch location"
              >
                {state.restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="dashboard-page__eyebrow">{restaurant.name}</p>
          )}
          <h1 className="dashboard-page__title">{allDone ? "You're live" : "Go live"}</h1>
          <p className="dashboard-page__lead">
            {allDone
              ? `Guests who call ${restaurant.name} reach your ROAL host. Watch tickets arrive on ${RESTAURANT_LIVE_ORDERS_LABEL}.`
              : "Five real checks, one at a time. Nothing here is simulated."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusChip tone={allDone ? "ok" : "neutral"}>
            {doneCount}/{steps.length} done
          </StatusChip>
          <Link href={ordersHref} className={allDone ? "btn-primary" : "btn-ghost"}>
            {RESTAURANT_LIVE_ORDERS_LABEL}
          </Link>
        </div>
      </header>

      {error ? (
        <p
          className="rounded-md border border-danger/25 bg-danger/5 px-3 py-2 text-[13px] text-danger [overflow-wrap:anywhere]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="onboarding-page__body grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-4">
          <Panel title="Get started">
            <div className="dashboard-progress mt-3" aria-hidden>
              <div
                className={cn("dashboard-progress__bar", allDone && "dashboard-progress__bar--ok")}
                style={{ width: `${Math.round((doneCount / Math.max(1, steps.length)) * 100)}%` }}
              />
            </div>
            <ol className="dashboard-checklist mt-2">
              {steps.map((step) => {
                const isNext = nextStep?.id === step.id;
                const isActive = activeId === step.id;
                return (
                  <li
                    key={step.id}
                    className={cn(
                      "dashboard-checklist__item",
                      step.done && "dashboard-checklist__item--done",
                      isNext && !focused && "dashboard-checklist__item--next"
                    )}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <LaunchCheckMark
                      status={step.done ? "done" : step.error ? "error" : "pending"}
                      active={isNext}
                    />
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => setFocused(step.id)}
                    >
                      <span className="dashboard-checklist__label block">{step.label}</span>
                      <span className="dashboard-checklist__detail block">{step.detail}</span>
                    </button>
                    <span className="dashboard-checklist__action">
                      {step.href ? (
                        <Link
                          href={step.href}
                          className={cn(isNext ? "btn-primary btn-sm" : "btn-ghost btn-sm")}
                        >
                          {step.done ? "Edit" : step.hrefLabel ?? "Open"}
                        </Link>
                      ) : !step.done ? (
                        <button
                          type="button"
                          className={cn(isNext ? "btn-primary btn-sm" : "btn-ghost btn-sm")}
                          onClick={() => setFocused(step.id)}
                        >
                          {step.error ? "Fix" : "Start"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => setFocused(step.id)}
                        >
                          View
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Panel>

          {activeId === "host" ? (
            <Panel>
              <OnboardingVoiceAgentStep
                restaurantId={restaurantId}
                restaurantName={restaurant.name}
                organizationId={orgId}
                voice={
                  state.activeRestaurantVoice ?? {
                    uiState: "not_started",
                    agentId: null,
                    provisionError: null,
                    lastSyncError: null,
                    lastSyncAt: null,
                    toolsSynced: false,
                  }
                }
                pending={pending}
                onReady={() => setFocused("test_call")}
                onSkipManual={() => setStep("voice_agent", "skipped")}
              />
            </Panel>
          ) : null}

          {activeId === "test_call" ? (
            <Panel>
              {state.activeRestaurantVoice?.agentId ? (
                <OnboardingTryCall
                  restaurantId={restaurantId}
                  organizationId={orgId}
                  restaurantName={restaurant.name}
                  restaurantPhone={state.activeRestaurantProfile?.phone ?? null}
                  outboundCallConfigured={state.outboundCallConfigured}
                />
              ) : (
                <p className="text-[13px] text-muted">
                  Set up the phone host first, then come back to test it.
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={pending || !state.activeRestaurantVoice?.agentId}
                  onClick={() => setStep("test_call", "completed")}
                >
                  I saw the order on {RESTAURANT_LIVE_ORDERS_LABEL}
                </button>
                <Link href={ordersHref} className="btn-ghost">
                  Open {RESTAURANT_LIVE_ORDERS_LABEL}
                </Link>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={pending}
                  onClick={() => setStep("test_call", "skipped")}
                >
                  Skip for now
                </button>
              </div>
            </Panel>
          ) : null}

          {activeId === "forward" ? (
            <ForwardNumberCard
              restaurantName={restaurant.name}
              restaurantPhone={state.activeRestaurantProfile?.phone ?? null}
              agentId={state.activeRestaurantVoice?.agentId ?? null}
              done={steps.find((s) => s.id === "forward")?.done ?? false}
              pending={pending}
              onForwarded={() => setStep("go_live", "completed")}
              ordersHref={ordersHref}
            />
          ) : null}

          {activeId === "menu" || activeId === "hours" ? (
            <Panel
              title={activeId === "menu" ? "Menu" : "Hours"}
              hint={
                activeId === "menu"
                  ? "Scan a photo, paste a link, or add items by hand. The host sells exactly what's here."
                  : "Weekly hours and holiday closures live in Menu setup next to the menu."
              }
            >
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={menuHref} className="btn-primary">
                  Open {RESTAURANT_MENU_SETUP_TITLE}
                </Link>
              </div>
            </Panel>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-4">
          {state.readiness ? (
            <OnboardingReadinessPanel readiness={state.readiness} compact />
          ) : null}
          <Panel title="This location" muted>
            <ul className="mt-2 grid gap-0.5 text-[13px] min-[380px]:grid-cols-2 lg:grid-cols-1">
              <WorkspaceLink href={ordersHref} label={RESTAURANT_LIVE_ORDERS_LABEL} />
              <WorkspaceLink href={menuHref} label={RESTAURANT_MENU_SETUP_TITLE} />
              <WorkspaceLink href={hostHref} label="Phone host" />
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function WorkspaceLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="-mx-1 flex min-h-11 items-center justify-between gap-2 rounded px-1 py-1.5 font-medium text-ink hover:bg-card lg:min-h-9"
      >
        {label}
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-subtle" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}

function ForwardNumberCard({
  restaurantName,
  restaurantPhone,
  agentId,
  done,
  pending,
  onForwarded,
  ordersHref,
}: {
  restaurantName: string;
  restaurantPhone: string | null;
  agentId: string | null;
  done: boolean;
  pending: boolean;
  onForwarded: () => void;
  ordersHref: string;
}) {
  const mailto = buildPilotMailto({
    subject: `Host phone number for ${restaurantName}`,
    body: [
      `Restaurant: ${restaurantName}`,
      restaurantPhone ? `Restaurant line: ${restaurantPhone}` : null,
      agentId ? `Agent: ${agentId}` : null,
      "",
      "Please send the phone number my ROAL host answers on so I can set up call forwarding.",
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
  });

  return (
    <Panel
      title="Forward your number"
      hint="Keep your existing number. Your carrier sends calls to the host; you can turn it off any time."
      aside={done ? <StatusChip tone="ok">Forwarded</StatusChip> : null}
    >
      <div className="mt-3 rounded-md border border-dashed border-line-strong bg-elev px-3 py-2.5">
        <p className="dashboard-page__kicker">Your host&apos;s phone number</p>
        <p className="mt-1 text-[13px] text-muted">
          We text you the number once the host is provisioned. Don&apos;t have it yet?{" "}
          <a href={mailto} className="font-medium text-ink underline underline-offset-2">
            Email {CONTACT_PILOT_EMAIL}
          </a>
          .
        </p>
      </div>

      <ol className="onboarding-page__forwarding-steps mt-4">
        <li>
          <span>
            From the restaurant phone{restaurantPhone ? ` (${restaurantPhone})` : ""}, dial your
            carrier&apos;s forwarding code followed by the host number. Most US carriers use{" "}
            <span className="font-mono text-ink">*72</span> to start forwarding and{" "}
            <span className="font-mono text-ink">*73</span> to stop; codes vary, so check with your
            carrier if those don&apos;t work.
          </span>
        </li>
        <li>
          <span>
            Call the restaurant from a cell phone. The host should pick up within two rings.
          </span>
        </li>
        <li>
          <span>Place a small order and watch it land on {RESTAURANT_LIVE_ORDERS_LABEL}.</span>
        </li>
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {done ? (
          <Link href={ordersHref} className="btn-primary">
            Open {RESTAURANT_LIVE_ORDERS_LABEL}
          </Link>
        ) : (
          <button type="button" className="btn-primary" disabled={pending} onClick={onForwarded}>
            I forwarded my number
          </button>
        )}
        <a href={mailto} className="btn-ghost">
          Need help forwarding?
        </a>
      </div>
    </Panel>
  );
}
