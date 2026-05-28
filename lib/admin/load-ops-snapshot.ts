import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminEnvFlags,
  AdminOpsSnapshot,
  AdminOrganizationOps,
  AdminRestaurantOps,
  OpsErrorRow,
} from "@/lib/admin/types";
import { sanitizeOpsErrorDetail } from "@/lib/admin/sanitize-ops-detail";
import { getEnvStatus } from "@/lib/env.server";
import {
  runHealthChecks,
  sanitizeHealthReportForPublic,
} from "@/lib/observability/health";
import { getUsageSummary } from "@/lib/usage/query";

import type { AdminOrgInput } from "@/lib/admin/resolve-admin-org-inputs";

function truncate(text: string | null | undefined, max = 280): string {
  return sanitizeOpsErrorDetail(text, max);
}

function agentIdSuffix(agentId: string | null | undefined): string | null {
  const id = agentId?.trim();
  if (!id) return null;
  if (id.length <= 8) return `···${id}`;
  return `···${id.slice(-6)}`;
}

function syncStatus(
  agentId: string | null | undefined,
  lastError: string | null | undefined
): AdminRestaurantOps["sync"]["status"] {
  if (!agentId?.trim()) return "never";
  if (lastError?.trim()) return "error";
  return "ok";
}

async function loadRecentErrors(
  supabase: SupabaseClient,
  organizationId: string,
  restaurantNames: Map<string, string>
): Promise<OpsErrorRow[]> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const rows: OpsErrorRow[] = [];

  const [audits, imports, notifications] = await Promise.all([
    supabase
      .from("audit_logs")
      .select(
        "id, action, outcome, metadata, restaurant_id, created_at, resource_type, resource_id"
      )
      .eq("organization_id", organizationId)
      .gte("created_at", since)
      .in("outcome", ["failure", "denied"])
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("menu_imports")
      .select(
        "id, restaurant_id, extraction_status, extraction_error, created_at, original_filename"
      )
      .eq("organization_id", organizationId)
      .gte("created_at", since)
      .in("extraction_status", ["extraction_failed", "commit_failed"])
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("notification_deliveries")
      .select("id, title, body, restaurant_id, event_type, created_at, error_message")
      .eq("organization_id", organizationId)
      .gte("created_at", since)
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (audits.error) throw new Error(audits.error.message);
  if (imports.error) throw new Error(imports.error.message);
  if (notifications.error) throw new Error(notifications.error.message);

  for (const row of audits.data ?? []) {
    const restaurantId = (row.restaurant_id as string | null) ?? null;
    const meta = row.metadata as Record<string, unknown> | null;
    const metaMessage =
      typeof meta?.message === "string" ? meta.message : undefined;
    rows.push({
      id: `audit:${row.id}`,
      source: "audit",
      occurredAt: row.created_at as string,
      title: String(row.action),
      detail: truncate(metaMessage ?? `${row.outcome} · ${row.resource_type ?? "event"}`),
      restaurantId,
      restaurantName: restaurantId
        ? restaurantNames.get(restaurantId) ?? null
        : null,
    });
  }

  for (const row of imports.data ?? []) {
    const restaurantId = row.restaurant_id as string;
    rows.push({
      id: `import:${row.id}`,
      source: "menu_import",
      occurredAt: row.created_at as string,
      title: `Menu scan ${row.extraction_status}`,
      detail: truncate(
        (row.extraction_error as string | null) ??
          (row.original_filename as string | null) ??
          "Import failed"
      ),
      restaurantId,
      restaurantName: restaurantNames.get(restaurantId) ?? null,
    });
  }

  for (const row of notifications.data ?? []) {
    const restaurantId = (row.restaurant_id as string | null) ?? null;
    rows.push({
      id: `notify:${row.id}`,
      source: "notification",
      occurredAt: row.created_at as string,
      title: row.title as string,
      detail: truncate(
        (row.error_message as string | null) ?? (row.body as string)
      ),
      restaurantId,
      restaurantName: restaurantId
        ? restaurantNames.get(restaurantId) ?? null
        : null,
    });
  }

  return rows
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
    .slice(0, 30);
}

async function loadOrganizationOps(
  supabase: SupabaseClient,
  input: AdminOrgInput
): Promise<AdminOrganizationOps> {
  const [orgRow, restaurantsResult, usage] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, billing_plan, subscription_status, trial_ends_at")
      .eq("id", input.organizationId)
      .maybeSingle(),
    supabase
      .from("restaurants")
      .select("id, name, created_at")
      .eq("organization_id", input.organizationId)
      .order("name", { ascending: true }),
    getUsageSummary(supabase, { organizationId: input.organizationId }),
  ]);

  if (orgRow.error) throw new Error(orgRow.error.message);
  if (restaurantsResult.error) throw new Error(restaurantsResult.error.message);

  const restaurants = restaurantsResult.data ?? [];
  const restaurantIds = restaurants.map((r) => r.id as string);
  const restaurantNames = new Map(
    restaurants.map((r) => [r.id as string, r.name as string])
  );

  let profiles: Array<{
    restaurant_id: string;
    elevenlabs_agent_id: string | null;
    elevenlabs_last_sync_at: string | null;
    elevenlabs_last_sync_error: string | null;
  }> = [];

  if (restaurantIds.length > 0) {
    const { data, error } = await supabase
      .from("restaurant_profiles")
      .select(
        "restaurant_id, elevenlabs_agent_id, elevenlabs_last_sync_at, elevenlabs_last_sync_error"
      )
      .in("restaurant_id", restaurantIds);
    if (error) throw new Error(error.message);
    profiles = (data ?? []) as typeof profiles;
  }

  const profileByRestaurant = new Map(
    profiles.map((p) => [p.restaurant_id, p])
  );

  const restaurantOps: AdminRestaurantOps[] = restaurants.map((r) => {
    const profile = profileByRestaurant.get(r.id as string);
    const agentId = profile?.elevenlabs_agent_id ?? null;
    const lastError = profile?.elevenlabs_last_sync_error ?? null;
    return {
      id: r.id as string,
      name: r.name as string,
      createdAt: r.created_at as string,
      sync: {
        agentConfigured: Boolean(agentId?.trim()),
        agentIdSuffix: agentIdSuffix(agentId),
        lastSyncAt: profile?.elevenlabs_last_sync_at ?? null,
        lastSyncError: sanitizeOpsErrorDetail(lastError, 200) || null,
        status: syncStatus(agentId, lastError),
      },
    };
  });

  const recentErrors = await loadRecentErrors(
    supabase,
    input.organizationId,
    restaurantNames
  );

  for (const rest of restaurantOps) {
    if (rest.sync.lastSyncError && rest.sync.status === "error") {
      const already = recentErrors.some(
        (e) =>
          e.source === "voice_sync" && e.restaurantId === rest.id
      );
      if (!already) {
        recentErrors.unshift({
          id: `sync:current:${rest.id}`,
          source: "voice_sync",
          occurredAt: rest.sync.lastSyncAt ?? new Date().toISOString(),
          title: "Voice agent sync error (current)",
          detail: rest.sync.lastSyncError,
          restaurantId: rest.id,
          restaurantName: rest.name,
        });
      }
    }
  }

  recentErrors.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  const org = orgRow.data;

  return {
    id: input.organizationId,
    name: org?.name ?? input.organizationName,
    role: input.role,
    billingPlan: (org?.billing_plan as string | null) ?? null,
    subscriptionStatus: (org?.subscription_status as string | null) ?? null,
    trialEndsAt: (org?.trial_ends_at as string | null) ?? null,
    restaurants: restaurantOps,
    usage,
    recentErrors: recentErrors.slice(0, 30),
  };
}

export async function loadAdminOpsSnapshot(
  supabase: SupabaseClient,
  adminOrgs: AdminOrgInput[]
): Promise<AdminOpsSnapshot> {
  const [rawHealth, organizations] = await Promise.all([
    runHealthChecks(),
    Promise.all(
      adminOrgs.map((org) => loadOrganizationOps(supabase, org))
    ),
  ]);
  const health = sanitizeHealthReportForPublic(rawHealth);

  const envFlags: AdminEnvFlags = getEnvStatus();

  return {
    generatedAt: new Date().toISOString(),
    health,
    envFlags,
    organizations,
  };
}
