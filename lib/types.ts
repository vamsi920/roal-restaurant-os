import { z } from "zod";
import type { DraftOrderStatus } from "@/lib/order-status";

export const ModifierSchema = z.object({
  group_name: z.string().min(1).default("Options"),
  modifier_name: z.string().min(1),
  extra_price: z.coerce.number().nonnegative().default(0),
  min_selection: z.coerce.number().int().nonnegative().default(0),
  max_selection: z.coerce.number().int().nonnegative().default(1),
});

export const MenuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.coerce.number().nonnegative().optional().nullable(),
  base_availability: z.boolean().optional().default(true),
  modifiers: z.array(ModifierSchema).optional().default([]),
});

export const MenuCategorySchema = z.object({
  name: z.string().min(1),
  sort_order: z.coerce.number().int().optional(),
  items: z.array(MenuItemSchema).default([]),
});

export const MenuSchema = z.object({
  categories: z.array(MenuCategorySchema).min(1),
});

export type Menu = z.infer<typeof MenuSchema>;
export type MenuCategory = z.infer<typeof MenuCategorySchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type Modifier = z.infer<typeof ModifierSchema>;

export type MembershipRole = "owner" | "admin" | "member";

export type Organization = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Membership = {
  id: string;
  organization_id: string;
  user_id: string;
  role: MembershipRole;
  created_at: string;
};

export type Restaurant = {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
};

/** `restaurant_profiles.elevenlabs_provision_status` */
export type ElevenLabsProvisionStatus =
  | "pending"
  | "provisioning"
  | "ready"
  | "failed";

/** `restaurant_profiles.elevenlabs_menu_auto_sync_status` */
export type ElevenLabsMenuAutoSyncStatus =
  | "pending"
  | "syncing"
  | "succeeded"
  | "failed";

export type RestaurantProfile = {
  restaurant_id: string;
  organization_id: string;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string;
  timezone: string;
  cuisine: string | null;
  website: string | null;
  allows_pickup: boolean;
  allows_delivery: boolean;
  prep_time_minutes: number;
  tax_rate_percent: number;
  service_fee_percent: number;
  escalation_name: string | null;
  escalation_phone: string | null;
  escalation_email: string | null;
  handoff_catering_route: string | null;
  handoff_complaint_route: string | null;
  handoff_unavailable_item_behavior: string | null;
  handoff_unavailable_item_notes: string | null;
  closed_hours_message: string | null;
  temporarily_closed: boolean;
  temporarily_closed_reason: string | null;
  elevenlabs_agent_id: string | null;
  elevenlabs_provision_status: ElevenLabsProvisionStatus | null;
  elevenlabs_provision_error: string | null;
  elevenlabs_provisioned_at: string | null;
  elevenlabs_menu_auto_sync_status: ElevenLabsMenuAutoSyncStatus | null;
  elevenlabs_menu_auto_sync_error: string | null;
  elevenlabs_last_sync_at: string | null;
  elevenlabs_last_sync_error: string | null;
  elevenlabs_last_sync_summary: unknown;
  created_at: string;
  updated_at: string;
};

/** Dev/POC default org created by migration 008. */
export const LEGACY_POC_ORGANIZATION_ID =
  "00000000-0000-4000-8000-000000000001";

export type {
  OnboardingStepStatus,
  OnboardingStepState,
  OrganizationOnboarding,
  RestaurantOnboarding,
  OrganizationOnboardingSteps,
  RestaurantOnboardingSteps,
  OnboardingProgressSummary,
} from "@/lib/onboarding/types";

export type {
  RestaurantWeeklyHour,
  RestaurantHoursException,
  RestaurantHoursBundle,
} from "@/lib/restaurant-hours/types";

export type {
  OnboardingStepKey,
  OrganizationOnboardingStepKey,
  RestaurantOnboardingStepKey,
} from "@/lib/onboarding/steps";

export type DbCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  updated_at: string;
};

export type DbItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | null;
  is_available: boolean;
  sort_order: number;
  raw_menu_data: unknown;
  updated_at: string;
};

export type DbModifier = {
  id: string;
  item_id: string;
  group_name: string;
  modifier_name: string;
  extra_price: number;
  min_selection: number;
  max_selection: number;
  sort_order: number;
  group_sort_order: number;
};

export type DraftOrderRow = {
  id: string;
  restaurant_id: string;
  session_id: string;
  status: DraftOrderStatus;
  items: unknown;
  customer_name: string | null;
  customer_phone: string | null;
  accepted_at: string | null;
  in_progress_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Immutable receipt row (upsert on finalize per session). */
export type PhoneOrderReceiptRow = {
  id: string;
  restaurant_id: string;
  session_id: string;
  items: unknown;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
};
