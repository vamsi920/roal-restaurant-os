import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ORGANIZATION_ONBOARDING_STEPS,
  RESTAURANT_ONBOARDING_STEPS,
  type OnboardingStepKey,
  type OrganizationOnboardingStepKey,
  type RestaurantOnboardingStepKey,
} from "@/lib/onboarding/steps";
import type {
  OnboardingProgressSummary,
  OnboardingStepState,
  OnboardingStepStatus,
  OrganizationOnboarding,
  OrganizationOnboardingSteps,
  RestaurantOnboarding,
  RestaurantOnboardingSteps,
} from "@/lib/onboarding/types";

const TERMINAL: OnboardingStepStatus[] = ["completed", "skipped"];

export function buildDefaultOrganizationSteps(): OrganizationOnboardingSteps {
  return {
    account: { status: "in_progress" },
  };
}

export function buildDefaultRestaurantSteps(): RestaurantOnboardingSteps {
  return Object.fromEntries(
    RESTAURANT_ONBOARDING_STEPS.map((key) => [key, { status: "pending" as const }])
  ) as RestaurantOnboardingSteps;
}

export function parseStepState(raw: unknown): OnboardingStepState | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const status = row.status;
  if (
    status !== "pending" &&
    status !== "in_progress" &&
    status !== "completed" &&
    status !== "skipped"
  ) {
    return null;
  }
  return {
    status,
    completed_at:
      typeof row.completed_at === "string" ? row.completed_at : null,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : undefined,
  };
}

export function normalizeOrganizationSteps(
  steps: unknown
): OrganizationOnboardingSteps {
  if (!steps || typeof steps !== "object") return buildDefaultOrganizationSteps();
  const out: OrganizationOnboardingSteps = {};
  for (const key of ORGANIZATION_ONBOARDING_STEPS) {
    const parsed = parseStepState((steps as Record<string, unknown>)[key]);
    if (parsed) out[key] = parsed;
  }
  if (!out.account) out.account = { status: "pending" };
  return out;
}

export function normalizeRestaurantSteps(steps: unknown): RestaurantOnboardingSteps {
  const defaults = buildDefaultRestaurantSteps();
  if (!steps || typeof steps !== "object") return defaults;
  const out: RestaurantOnboardingSteps = { ...defaults };
  for (const key of RESTAURANT_ONBOARDING_STEPS) {
    const parsed = parseStepState((steps as Record<string, unknown>)[key]);
    if (parsed) out[key] = parsed;
  }
  return out;
}

export function computeOnboardingProgress(
  orderedKeys: readonly string[],
  steps: Record<string, OnboardingStepState | undefined>
): OnboardingProgressSummary {
  let completed = 0;
  let nextStep: string | null = null;

  for (const key of orderedKeys) {
    const state = steps[key];
    if (state && TERMINAL.includes(state.status)) {
      completed += 1;
    } else if (!nextStep) {
      nextStep = key;
    }
  }

  const total = orderedKeys.length;
  const percent = total === 0 ? 100 : Math.round((completed / total) * 100);
  const isComplete = completed >= total;

  return { completed, total, percent, nextStep, isComplete };
}

export function organizationOnboardingProgress(
  row: OrganizationOnboarding
): OnboardingProgressSummary {
  return computeOnboardingProgress(ORGANIZATION_ONBOARDING_STEPS, row.steps);
}

export function restaurantOnboardingProgress(
  row: RestaurantOnboarding
): OnboardingProgressSummary {
  return computeOnboardingProgress(RESTAURANT_ONBOARDING_STEPS, row.steps);
}

function mergeStepUpdate(
  steps: Record<string, OnboardingStepState | undefined>,
  stepKey: string,
  status: OnboardingStepStatus,
  metadata?: Record<string, unknown>
): Record<string, OnboardingStepState> {
  const prev = steps[stepKey] ?? { status: "pending" as const };
  const completed_at =
    status === "completed"
      ? new Date().toISOString()
      : prev.completed_at ?? null;

  const next: OnboardingStepState = {
    status,
    completed_at,
    ...(prev.metadata ? { metadata: prev.metadata } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
  };

  return { ...steps, [stepKey]: next } as Record<string, OnboardingStepState>;
}

function resolveCurrentStep(
  orderedKeys: readonly string[],
  steps: Record<string, OnboardingStepState | undefined>
): string | null {
  const progress = computeOnboardingProgress(orderedKeys, steps);
  return progress.isComplete ? null : progress.nextStep;
}

function allStepsTerminal(
  orderedKeys: readonly string[],
  steps: Record<string, OnboardingStepState | undefined>
): boolean {
  return orderedKeys.every((key) => {
    const s = steps[key]?.status;
    return s === "completed" || s === "skipped";
  });
}

export async function getOrganizationOnboarding(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrganizationOnboarding | null> {
  const { data, error } = await supabase
    .from("organization_onboarding")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    ...data,
    steps: normalizeOrganizationSteps(data.steps),
    current_step: data.current_step,
  };
}

export async function getRestaurantOnboarding(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<RestaurantOnboarding | null> {
  const { data, error } = await supabase
    .from("restaurant_onboarding")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    ...data,
    steps: normalizeRestaurantSteps(data.steps),
    current_step: data.current_step,
  };
}

export async function ensureOrganizationOnboarding(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrganizationOnboarding> {
  const existing = await getOrganizationOnboarding(supabase, organizationId);
  if (existing) return existing;

  const steps = buildDefaultOrganizationSteps();
  const { data, error } = await supabase
    .from("organization_onboarding")
    .insert({
      organization_id: organizationId,
      steps,
      current_step: "account",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    steps: normalizeOrganizationSteps(data.steps),
    current_step: data.current_step,
  };
}

export async function ensureRestaurantOnboarding(
  supabase: SupabaseClient,
  restaurantId: string,
  organizationId: string
): Promise<RestaurantOnboarding> {
  const existing = await getRestaurantOnboarding(supabase, restaurantId);
  if (existing) return existing;

  const steps = buildDefaultRestaurantSteps();
  const { data, error } = await supabase
    .from("restaurant_onboarding")
    .insert({
      restaurant_id: restaurantId,
      organization_id: organizationId,
      steps,
      current_step: "restaurant_profile",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    steps: normalizeRestaurantSteps(data.steps),
    current_step: data.current_step,
  };
}

export async function updateOrganizationOnboardingStep(
  supabase: SupabaseClient,
  organizationId: string,
  stepKey: OrganizationOnboardingStepKey,
  status: OnboardingStepStatus,
  metadata?: Record<string, unknown>
): Promise<OrganizationOnboarding> {
  const row = await ensureOrganizationOnboarding(supabase, organizationId);
  const steps = mergeStepUpdate(
    row.steps,
    stepKey,
    status,
    metadata
  ) as OrganizationOnboardingSteps;
  const current_step = resolveCurrentStep(ORGANIZATION_ONBOARDING_STEPS, steps);
  const completed_at = allStepsTerminal(ORGANIZATION_ONBOARDING_STEPS, steps)
    ? new Date().toISOString()
    : null;

  const { data, error } = await supabase
    .from("organization_onboarding")
    .update({
      steps,
      current_step,
      completed_at,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    steps: normalizeOrganizationSteps(data.steps),
    current_step: data.current_step,
  };
}

export async function updateRestaurantOnboardingStep(
  supabase: SupabaseClient,
  restaurantId: string,
  organizationId: string,
  stepKey: RestaurantOnboardingStepKey,
  status: OnboardingStepStatus,
  metadata?: Record<string, unknown>
): Promise<RestaurantOnboarding> {
  const row = await ensureRestaurantOnboarding(
    supabase,
    restaurantId,
    organizationId
  );
  const steps = mergeStepUpdate(
    row.steps,
    stepKey,
    status,
    metadata
  ) as RestaurantOnboardingSteps;
  const current_step = resolveCurrentStep(RESTAURANT_ONBOARDING_STEPS, steps);
  const completed_at = allStepsTerminal(RESTAURANT_ONBOARDING_STEPS, steps)
    ? new Date().toISOString()
    : null;

  const { data, error } = await supabase
    .from("restaurant_onboarding")
    .update({
      steps,
      current_step,
      completed_at,
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", restaurantId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    steps: normalizeRestaurantSteps(data.steps),
    current_step: data.current_step,
  };
}

/** Mark account step complete after auth + membership exist. */
export async function completeOrganizationAccountStep(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrganizationOnboarding> {
  return updateOrganizationOnboardingStep(
    supabase,
    organizationId,
    "account",
    "completed"
  );
}

export function isOnboardingStepKey(value: string): value is OnboardingStepKey {
  return (
    (ORGANIZATION_ONBOARDING_STEPS as readonly string[]).includes(value) ||
    (RESTAURANT_ONBOARDING_STEPS as readonly string[]).includes(value)
  );
}
