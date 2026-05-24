import type {
  OrganizationOnboardingStepKey,
  RestaurantOnboardingStepKey,
} from "@/lib/onboarding/steps";

export type OnboardingStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

export type OnboardingStepState = {
  status: OnboardingStepStatus;
  completed_at?: string | null;
  metadata?: Record<string, unknown>;
};

export type OrganizationOnboardingSteps = Partial<
  Record<OrganizationOnboardingStepKey, OnboardingStepState>
>;

export type RestaurantOnboardingSteps = Partial<
  Record<RestaurantOnboardingStepKey, OnboardingStepState>
>;

export type OrganizationOnboarding = {
  organization_id: string;
  steps: OrganizationOnboardingSteps;
  current_step: OrganizationOnboardingStepKey | string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

export type RestaurantOnboarding = {
  restaurant_id: string;
  organization_id: string;
  steps: RestaurantOnboardingSteps;
  current_step: RestaurantOnboardingStepKey | string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

export type OnboardingProgressSummary = {
  completed: number;
  total: number;
  percent: number;
  nextStep: string | null;
  isComplete: boolean;
};
