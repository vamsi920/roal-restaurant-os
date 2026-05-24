import type { HealthReport } from "@/lib/observability/health";
import type { UsageSummary } from "@/lib/usage/query";
import type { MembershipRole } from "@/lib/types";

export type OpsErrorSource =
  | "audit"
  | "menu_import"
  | "notification"
  | "voice_sync";

export type OpsErrorRow = {
  id: string;
  source: OpsErrorSource;
  occurredAt: string;
  title: string;
  detail: string;
  restaurantId: string | null;
  restaurantName: string | null;
};

export type AdminRestaurantOps = {
  id: string;
  name: string;
  createdAt: string;
  sync: {
    agentConfigured: boolean;
    agentIdSuffix: string | null;
    lastSyncAt: string | null;
    lastSyncError: string | null;
    status: "ok" | "error" | "never";
  };
};

export type AdminOrganizationOps = {
  id: string;
  name: string;
  role: MembershipRole;
  billingPlan: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  restaurants: AdminRestaurantOps[];
  usage: UsageSummary;
  recentErrors: OpsErrorRow[];
};

export type AdminEnvFlags = {
  supabase: boolean;
  serviceRole: boolean;
  gemini: boolean;
  elevenlabs: boolean;
  agentTools: boolean;
  agentToolSigning: boolean;
  appUrl: boolean;
  stripe: boolean;
};

export type AdminOpsSnapshot = {
  generatedAt: string;
  health: HealthReport;
  envFlags: AdminEnvFlags;
  organizations: AdminOrganizationOps[];
};
