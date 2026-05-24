import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditOutcome = "success" | "failure" | "denied";

export type WriteAuditLogInput = {
  requestId?: string | null;
  organizationId?: string | null;
  restaurantId?: string | null;
  userId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  outcome?: AuditOutcome;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(
  supabase: SupabaseClient,
  input: WriteAuditLogInput
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    request_id: input.requestId?.trim() || null,
    organization_id: input.organizationId ?? null,
    restaurant_id: input.restaurantId ?? null,
    user_id: input.userId ?? null,
    action: input.action,
    resource_type: input.resourceType ?? null,
    resource_id: input.resourceId ?? null,
    outcome: input.outcome ?? "success",
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error(
      JSON.stringify({
        level: "error",
        ts: new Date().toISOString(),
        msg: "audit_log_insert_failed",
        request_id: input.requestId,
        action: input.action,
        error: error.message,
      })
    );
  }
}
