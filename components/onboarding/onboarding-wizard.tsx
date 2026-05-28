"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { MenuScanner } from "@/app/dashboard/restaurants/[id]/MenuScanner";
import { connectElevenLabsAgentToRestaurantAction } from "@/app/dashboard/restaurants/[id]/elevenlabs-actions";
import {
  completeAccountStepAction,
  completeMenuImportStepAction,
  createOrganizationAction,
  createRestaurantWizardAction,
  saveRestaurantProfileAction,
  setWizardStepStatusAction,
} from "@/app/dashboard/onboarding/actions";
import { formatSupabaseClientError } from "@/lib/dashboard/format-user-error";
import { cn } from "@/lib/cn";
import {
  RESTAURANT_LIVE_ORDERS_LABEL,
  RESTAURANT_MENU_AGENT_LABEL,
} from "@/lib/dashboard-restaurant-labels";
import {
  ONBOARDING_LAUNCH_STEPS,
  ONBOARDING_STEP_DESCRIPTIONS,
  ONBOARDING_STEP_LABELS,
  type OnboardingStepKey,
} from "@/lib/onboarding/steps";
import { isOnboardingStepNavDisabled } from "@/lib/onboarding/nav";
import {
  WIZARD_STEP_ORDER,
  type OnboardingWizardState,
} from "@/lib/onboarding/wizard-types";
import type { OnboardingStepStatus } from "@/lib/onboarding/types";

type Props = {
  initialState: OnboardingWizardState;
};

function stepRequiresRestaurant(key: OnboardingStepKey): boolean {
  return key !== "account" && key !== "restaurant_profile";
}

function stepStatus(
  state: OnboardingWizardState,
  key: OnboardingStepKey
): OnboardingStepStatus {
  if (key === "account") {
    return state.organizationOnboarding?.steps.account?.status ?? "pending";
  }
  return (
    state.restaurantOnboarding?.steps[
      key as keyof typeof state.restaurantOnboarding.steps
    ]?.status ?? "pending"
  );
}

function StepIcon({ status }: { status: OnboardingStepStatus }) {
  if (status === "completed" || status === "skipped") {
    return (
      <span className="grid h-6 w-6 place-items-center rounded-full bg-success/15 text-success">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === "in_progress") {
    return <span className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />;
  }
  return <span className="h-6 w-6 rounded-full border-2 border-line" />;
}

export function OnboardingWizard({ initialState }: Props) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [activeStep, setActiveStep] = useState<OnboardingStepKey>(
    initialState.activeStep
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setState(initialState);
    setActiveStep(initialState.activeStep);
  }, [initialState]);

  const orgId = state.organization?.id ?? null;
  const restaurant = state.activeRestaurant;
  const restaurantId = restaurant?.id ?? null;
  const resumeStep = state.activeStep;

  const navStepStatus = useCallback(
    (key: OnboardingStepKey) => stepStatus(state, key),
    [state]
  );

  const overallPercent = useMemo(() => {
    const orgDone = state.orgProgress.completed;
    const restDone = state.restaurantProgress.completed;
    const total = WIZARD_STEP_ORDER.length;
    return Math.round(((orgDone + restDone) / total) * 100);
  }, [state.orgProgress.completed, state.restaurantProgress.completed]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const run = useCallback(
    (fn: () => Promise<void>) => {
      setError(null);
      startTransition(async () => {
        try {
          await fn();
          refresh();
        } catch (e) {
          setError(
            formatSupabaseClientError(
              e instanceof Error ? e.message : "Something went wrong"
            )
          );
        }
      });
    },
    [refresh]
  );

  const profileDefaults = state.activeRestaurantProfile;

  return (
    <div className="onboarding-page mx-auto max-w-5xl min-w-0 overflow-x-hidden">
      <header className="onboarding-page__header mb-6 sm:mb-8">
        <p className="text-xs font-medium text-subtle">Setup</p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          First store setup
        </h1>
        <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-muted">
          {ONBOARDING_LAUNCH_STEPS.join(" → ")}. Resume anytime.
        </p>
        <ol className="onboarding-roadmap mt-4 grid list-none grid-cols-1 gap-2 p-0 min-[380px]:grid-cols-2 sm:grid-cols-4">
          {ONBOARDING_LAUNCH_STEPS.map((label, i) => (
            <li
              key={label}
              className="rounded-lg border border-line bg-card px-2.5 py-2 text-center text-xs font-medium text-ink sm:px-3 sm:py-2.5 sm:text-[0.8125rem]"
            >
              <span className="text-subtle tabular-nums">{i + 1}.</span> {label}
            </li>
          ))}
        </ol>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-elev">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-subtle tabular-nums">{overallPercent}% complete</p>
      </header>

      {error ? (
        <p
          className="onboarding-page__error mb-4 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger [overflow-wrap:anywhere]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {pending ? (
        <p className="mb-4 text-sm text-muted" aria-live="polite">
          Saving…
        </p>
      ) : null}

      <div className="onboarding-page__body grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,13.5rem)_1fr]">
        <nav className="onboarding-page__nav glass-card p-2.5 sm:p-3" aria-label="Onboarding steps">
          <ul className="space-y-0.5">
            {WIZARD_STEP_ORDER.map((key) => {
              const status = stepStatus(state, key);
              const disabled = isOnboardingStepNavDisabled(key, {
                orgId,
                restaurantId,
                resumeStep,
                stepStatus: navStepStatus,
              });
              return (
                <li key={key}>
                  <button
                    type="button"
                    disabled={disabled || pending}
                    onClick={() => setActiveStep(key)}
                    className={cn(
                      "flex min-h-11 w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                      activeStep === key
                        ? "bg-accent-soft ring-1 ring-accent/20"
                        : "hover:bg-elev",
                      disabled && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <StepIcon status={status} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-snug text-ink">
                        {ONBOARDING_STEP_LABELS[key]}
                      </span>
                      <span className="block text-xs capitalize text-subtle">
                        {status.replace("_", " ")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="onboarding-page__panel glass-card min-w-0 p-4 sm:p-6">
          <h2 className="text-base font-semibold text-ink sm:text-lg">
            {ONBOARDING_STEP_LABELS[activeStep]}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {ONBOARDING_STEP_DESCRIPTIONS[activeStep]}
          </p>

          <div className="mt-6">
            {activeStep === "account" && (
              <AccountStep
                state={state}
                pending={pending}
                onCreateOrg={(name) =>
                  run(async () => {
                    await createOrganizationAction({ name });
                  })
                }
                onContinue={(organizationId) =>
                  run(async () => {
                    await completeAccountStepAction(organizationId);
                  })
                }
                onGoToRestaurant={() => setActiveStep("restaurant_profile")}
              />
            )}

            {activeStep === "restaurant_profile" && orgId && (
              <ProfileStep
                key={restaurantId ?? "new"}
                restaurant={restaurant}
                pending={pending}
                initialPhone={profileDefaults?.phone ?? ""}
                initialTimezone={profileDefaults?.timezone ?? ""}
                initialAddress={profileDefaults?.address_line1 ?? ""}
                onCreate={(name) =>
                  run(async () => {
                    const { restaurantId: id } = await createRestaurantWizardAction({
                      name,
                      organizationId: orgId,
                    });
                    router.push(`/dashboard/onboarding?restaurant=${id}`);
                  })
                }
                onSave={(fields) =>
                  run(async () => {
                    if (!restaurantId) throw new Error("Create a restaurant first.");
                    await saveRestaurantProfileAction({
                      restaurantId,
                      organizationId: orgId,
                      ...fields,
                    });
                    setActiveStep("menu_import");
                  })
                }
              />
            )}

            {activeStep === "menu_import" && restaurantId && orgId && (
              <MenuStep
                restaurantId={restaurantId}
                categoryCount={state.menuCategoryCount}
                pending={pending}
                onContinue={() =>
                  run(async () => {
                    await completeMenuImportStepAction({
                      restaurantId,
                      organizationId: orgId,
                    });
                    setActiveStep("voice_agent");
                  })
                }
                onSkip={() =>
                  run(async () => {
                    await setWizardStepStatusAction({
                      scope: "restaurant",
                      organizationId: orgId,
                      restaurantId,
                      step: "menu_import",
                      status: "skipped",
                    });
                    setActiveStep("voice_agent");
                  })
                }
                onScanned={refresh}
              />
            )}

            {activeStep === "voice_agent" && restaurant && orgId && (
              <VoiceStep
                restaurantId={restaurant.id}
                restaurantName={restaurant.name}
                pending={pending}
                onDone={(status) =>
                  run(async () => {
                    await setWizardStepStatusAction({
                      scope: "restaurant",
                      organizationId: orgId,
                      restaurantId: restaurant.id,
                      step: "voice_agent",
                      status,
                    });
                    setActiveStep("test_call");
                  })
                }
              />
            )}

            {activeStep === "test_call" && restaurantId && orgId && (
              <TestCallStep
                restaurantId={restaurantId}
                pending={pending}
                onComplete={() =>
                  run(async () => {
                    await setWizardStepStatusAction({
                      scope: "restaurant",
                      organizationId: orgId,
                      restaurantId,
                      step: "test_call",
                      status: "completed",
                    });
                    setActiveStep("go_live");
                  })
                }
                onSkip={() =>
                  run(async () => {
                    await setWizardStepStatusAction({
                      scope: "restaurant",
                      organizationId: orgId,
                      restaurantId,
                      step: "test_call",
                      status: "skipped",
                    });
                    setActiveStep("go_live");
                  })
                }
              />
            )}

            {activeStep === "go_live" && restaurantId && orgId && (
              <GoLiveStep
                restaurantId={restaurantId}
                restaurantName={restaurant?.name ?? "Restaurant"}
                pending={pending}
                isComplete={state.restaurantProgress.isComplete}
                onLaunch={() =>
                  run(async () => {
                    await setWizardStepStatusAction({
                      scope: "restaurant",
                      organizationId: orgId,
                      restaurantId,
                      step: "go_live",
                      status: "completed",
                    });
                  })
                }
              />
            )}

            {activeStep !== "account" && !orgId && (
              <p className="text-sm text-muted">Complete account setup first.</p>
            )}

            {orgId &&
              stepRequiresRestaurant(activeStep) &&
              !restaurantId && (
                <p className="text-sm text-muted">
                  Add a restaurant before this step.
                </p>
              )}
          </div>
        </div>
      </div>

      {state.restaurants.length > 1 && restaurantId ? (
        <p className="mt-4 text-xs text-subtle">
          Setting up: <span className="font-medium text-ink">{restaurant?.name}</span>
          {" · "}
          <Link href="/dashboard/restaurants" className="text-accent hover:underline">
            All locations
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function AccountStep({
  state,
  pending,
  onCreateOrg,
  onContinue,
  onGoToRestaurant,
}: {
  state: OnboardingWizardState;
  pending: boolean;
  onCreateOrg: (name: string) => void;
  onContinue: (organizationId: string) => void;
  onGoToRestaurant: () => void;
}) {
  const [orgName, setOrgName] = useState("");
  const hasOrg = Boolean(state.organization);
  const accountDone =
    state.organizationOnboarding?.steps.account?.status === "completed";

  if (hasOrg) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Signed in as <span className="font-medium text-ink">{state.userEmail}</span>
          {state.organization ? (
            <>
              {" "}
              · Organization:{" "}
              <span className="font-medium text-ink">{state.organization.name}</span>
            </>
          ) : null}
        </p>
        {!accountDone && state.organization ? (
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() => onContinue(state.organization!.id)}
          >
            Confirm account & continue
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-success">Account step complete.</p>
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={onGoToRestaurant}
            >
              Continue to add restaurant
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      className="space-y-4 max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        onCreateOrg(orgName);
      }}
    >
      <p className="text-sm text-muted">Name your organization. You will be the owner.</p>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-subtle">
          Organization name
        </span>
        <input
          className="input-base mt-1.5"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="e.g. Joe's Restaurant Group"
          required
          disabled={pending}
        />
      </label>
      <button type="submit" className="btn-primary" disabled={pending || !orgName.trim()}>
        Create organization
      </button>
    </form>
  );
}

function ProfileStep({
  restaurant,
  pending,
  initialPhone,
  initialTimezone,
  initialAddress,
  onCreate,
  onSave,
}: {
  restaurant: OnboardingWizardState["activeRestaurant"];
  pending: boolean;
  initialPhone: string;
  initialTimezone: string;
  initialAddress: string;
  onCreate: (name: string) => void;
  onSave: (fields: {
    name: string;
    phone?: string;
    timezone?: string;
    address?: string;
  }) => void;
}) {
  const [name, setName] = useState(restaurant?.name ?? "");
  const [phone, setPhone] = useState(initialPhone);
  const [timezone, setTimezone] = useState(initialTimezone || "America/Chicago");
  const [address, setAddress] = useState(initialAddress);

  useEffect(() => {
    setName(restaurant?.name ?? "");
    setPhone(initialPhone);
    setTimezone(initialTimezone || "America/Chicago");
    setAddress(initialAddress);
  }, [restaurant?.id, restaurant?.name, initialPhone, initialTimezone, initialAddress]);

  if (!restaurant) {
    return (
      <form
        className="space-y-4 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate(name);
        }}
      >
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-subtle">
            Restaurant name
          </span>
          <input
            className="input-base mt-1.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lupa Trattoria"
            required
            disabled={pending}
          />
        </label>
        <button type="submit" className="btn-primary" disabled={pending || !name.trim()}>
          Create location
        </button>
      </form>
    );
  }

  return (
    <form
      className="space-y-4 max-w-lg"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, phone, timezone, address });
      }}
    >
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-subtle">
          Restaurant name
        </span>
        <input
          className="input-base mt-1.5"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={pending}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-subtle">
          Phone line (for voice orders)
        </span>
        <input
          className="input-base mt-1.5"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 0100"
          disabled={pending}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-subtle">
          Timezone
        </span>
        <input
          className="input-base mt-1.5"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="America/Chicago"
          disabled={pending}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-subtle">
          Address (optional)
        </span>
        <input
          className="input-base mt-1.5"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St"
          disabled={pending}
        />
      </label>
      <p className="text-xs text-muted">
        Hours and closures are set in {RESTAURANT_LIVE_ORDERS_LABEL} after setup.
      </p>
      <button type="submit" className="btn-primary" disabled={pending || !name.trim()}>
        Save & continue
      </button>
    </form>
  );
}

function MenuStep({
  restaurantId,
  categoryCount,
  pending,
  onContinue,
  onSkip,
  onScanned,
}: {
  restaurantId: string;
  categoryCount: number;
  pending: boolean;
  onContinue: () => void;
  onSkip: () => void;
  onScanned: () => void;
}) {
  const hasMenu = categoryCount > 0;

  return (
    <div className="space-y-4">
      {hasMenu ? (
        <p className="text-sm text-success">
          Menu ready ({categoryCount} categor{categoryCount === 1 ? "y" : "ies"}). Continue
          to connect agent.
        </p>
      ) : (
        <p className="text-sm text-muted">
          Upload a menu photo for AI import, or skip and add items in{" "}
          {RESTAURANT_MENU_AGENT_LABEL} later.
        </p>
      )}
      <MenuScanner
        restaurantId={restaurantId}
        compact
        onScanComplete={onScanned}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={pending || !hasMenu}
          onClick={onContinue}
        >
          Continue with menu
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={onSkip}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

function VoiceStep({
  restaurantId,
  restaurantName,
  pending,
  onDone,
}: {
  restaurantId: string;
  restaurantName: string;
  pending: boolean;
  onDone: (status: "completed" | "skipped") => void;
}) {
  const [agentId, setAgentId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted">
        Paste your ElevenLabs agent id for{" "}
        <span className="font-medium text-ink">{restaurantName}</span>. ROAL syncs
        menu tools and the order profile. Skip if you will connect in{" "}
        {RESTAURANT_MENU_AGENT_LABEL} later.
      </p>
      <input
        className="input-base"
        placeholder="ElevenLabs agent id"
        value={agentId}
        onChange={(e) => setAgentId(e.target.value)}
        disabled={pending || connecting}
      />
      {localError ? (
        <p className="text-sm text-danger">{localError}</p>
      ) : null}
      {result ? <p className="text-xs text-muted break-words">{result}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={pending || connecting || !agentId.trim()}
          onClick={async () => {
            setLocalError(null);
            setResult(null);
            setConnecting(true);
            try {
              const { sync, profile } = await connectElevenLabsAgentToRestaurantAction({
                agentId,
                restaurantId,
                restaurantName,
              });
              setResult(
                `Tools synced (${sync.tools.length}). Profile ${profile.knowledge_base_doc_attached ? "with" : "without"} KB.`
              );
              onDone("completed");
            } catch (e) {
              setLocalError(e instanceof Error ? e.message : "Connect failed");
            } finally {
              setConnecting(false);
            }
          }}
        >
          {connecting ? "Connecting…" : "Connect agent"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() => onDone("skipped")}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

function TestCallStep({
  restaurantId,
  pending,
  onComplete,
  onSkip,
}: {
  restaurantId: string;
  pending: boolean;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted">
        Place one test call and confirm the ticket shows in {RESTAURANT_LIVE_ORDERS_LABEL}.
      </p>
      <ul className="list-inside list-disc space-y-1 text-sm text-muted">
        <li>Call your agent or use the web test UI.</li>
        <li>Order a menu item and watch the ticket appear.</li>
      </ul>
      <p className="text-xs text-subtle">
        <Link
          href={`/dashboard/restaurants/${restaurantId}`}
          className="text-accent hover:underline"
        >
          Open {RESTAURANT_LIVE_ORDERS_LABEL}
        </Link>{" "}
        while you test.
      </p>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          disabled={pending}
        />
        <span>I completed a test call and saw the order in Live orders.</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={pending || !confirmed}
          onClick={onComplete}
        >
          Mark test call complete
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={onSkip}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

function GoLiveStep({
  restaurantId,
  restaurantName,
  pending,
  isComplete,
  onLaunch,
}: {
  restaurantId: string;
  restaurantName: string;
  pending: boolean;
  isComplete: boolean;
  onLaunch: () => void;
}) {
  if (isComplete) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-success">
          {restaurantName} is ready. Open {RESTAURANT_LIVE_ORDERS_LABEL} for phone pickup.
        </p>
        <Link href={`/dashboard/restaurants/${restaurantId}`} className="btn-primary inline-flex">
          {RESTAURANT_LIVE_ORDERS_LABEL}
        </Link>
        <Link href="/dashboard/restaurants" className="btn-ghost ml-2 inline-flex">
          All locations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted">
        Finish setup, then open {RESTAURANT_LIVE_ORDERS_LABEL} for guest calls.
      </p>
      <button type="button" className="btn-primary" disabled={pending} onClick={onLaunch}>
        Finish & open live orders
      </button>
    </div>
  );
}
