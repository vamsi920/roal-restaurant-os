/**
 * Table metadata for the document store (Firestore or in-memory).
 * Mirrors what Postgres used to enforce: primary keys, defaults, unique keys,
 * cascades, and the "after insert" rows the old triggers created.
 */

export type Row = Record<string, unknown>;

export type TableSpec = {
  /** Columns forming the document id (joined with "__"). Default ["id"]. */
  pk?: string[];
  /** Auto-generate `id` (uuid) when missing. Default true when pk is ["id"]. */
  autoId?: boolean;
  /** Column defaults applied on insert. Functions run per row. */
  defaults?: Record<string, unknown | (() => unknown)>;
  /** Unique column sets (besides pk) — inserts that collide fail with code 23505. */
  unique?: string[][];
};

const now = () => new Date().toISOString();

export const TABLES: Record<string, TableSpec> = {
  organizations: {
    defaults: { created_at: now, updated_at: now, billing_plan: "starter", subscription_status: "trialing" },
    unique: [["slug"]],
  },
  profiles: { autoId: false, defaults: { created_at: now, updated_at: now } },
  memberships: { defaults: { role: "member", created_at: now }, unique: [["organization_id", "user_id"]] },
  internal_config: { pk: ["key"], defaults: { updated_at: now } },
  organization_onboarding: { pk: ["organization_id"], defaults: { steps: {}, started_at: now, updated_at: now } },
  restaurant_onboarding: { pk: ["restaurant_id"], defaults: { steps: {}, started_at: now, updated_at: now } },
  restaurants: { defaults: { created_at: now, inherited_menu_template_override_count: 0 } },
  restaurant_profiles: {
    pk: ["restaurant_id"],
    defaults: {
      country: "US",
      timezone: "America/New_York",
      allows_pickup: true,
      allows_delivery: false,
      prep_time_minutes: 20,
      tax_rate_percent: 0,
      service_fee_percent: 0,
      temporarily_closed: false,
      trial_scorecard: {},
      created_at: now,
      updated_at: now,
    },
  },
  restaurant_weekly_hours: {
    defaults: { is_closed: false, created_at: now, updated_at: now },
    unique: [["restaurant_id", "day_of_week"]],
  },
  restaurant_hours_exceptions: {
    defaults: { is_closed: true, created_at: now, updated_at: now },
    unique: [["restaurant_id", "exception_date"]],
  },
  categories: { defaults: { sort_order: 0, created_at: now, updated_at: now }, unique: [["restaurant_id", "name"]] },
  items: { defaults: { is_available: true, sort_order: 0, created_at: now, updated_at: now }, unique: [["category_id", "name"]] },
  modifiers: {
    defaults: { extra_price: 0, min_selection: 0, max_selection: 1, sort_order: 0, group_sort_order: 0, created_at: now },
  },
  draft_orders: { defaults: { items: [], created_at: now, updated_at: now }, unique: [["restaurant_id", "session_id"]] },
  phone_order_receipts: { defaults: { items: [], created_at: now }, unique: [["restaurant_id", "session_id"]] },
  menu_imports: { defaults: { storage_bucket: "menu-uploads", extraction_status: "pending", created_at: now, updated_at: now } },
  agent_tool_idempotency: { pk: ["restaurant_id", "idempotency_key"], defaults: { http_status: 200, created_at: now } },
  usage_events: { defaults: { occurred_at: now, metadata: {} }, unique: [["idempotency_key"]] },
  notification_settings: {
    pk: ["organization_id"],
    defaults: {
      provider_mode: "dev_console",
      enabled_events: [
        "order_completed",
        "sync_failure",
        "scan_failure",
        "order_stuck",
        "realtime_degraded",
        "provision_failure",
        "menu_auto_sync_failure",
        "go_live",
        "staff_handoff_requested",
        "voicemail_callback",
        "reservation_request",
        "catering_inquiry",
        "complaint_caller",
        "call_review_needed",
        "stuck_active_call",
      ],
      channels: { dev_console: true, email: false, sms: false, webhook: false },
      email_recipients: [],
      sms_recipients: [],
      order_stuck_minutes: 30,
      created_at: now,
      updated_at: now,
    },
  },
  notification_deliveries: { defaults: { payload: {}, status: "sent", created_at: now }, unique: [["idempotency_key"]] },
  audit_logs: { defaults: { outcome: "success", metadata: {}, created_at: now } },
  agent_call_events: {
    defaults: { status: "active", outcome: "unknown", transcript_metadata: {}, created_at: now, updated_at: now },
    unique: [["restaurant_id", "session_id"]],
  },
  restaurant_knowledge_entries: { defaults: { category: "general", is_active: true, sort_order: 0, created_at: now, updated_at: now } },
  restaurant_upsell_rules: { defaults: { is_active: true, sort_order: 0, created_at: now, updated_at: now } },
  organization_menu_templates: {
    defaults: { category_count: 0, item_count: 0, modifier_count: 0, is_default: false, created_at: now, updated_at: now },
    unique: [["organization_id", "name"]],
  },
  agent_trials: {
    defaults: {
      status: "resolving",
      step_log: [],
      knowledge: [],
      persona: {},
      scorecard: {},
      call_count: 0,
      created_at: now,
      updated_at: now,
      expires_at: () => new Date(Date.now() + 7 * 864e5).toISOString(),
    },
  },
  /** Contact details captured at the end of the public /start funnel (one per trial). */
  trial_leads: {
    pk: ["trial_id"],
    autoId: false,
    defaults: { call_status: "not_requested", created_at: now, updated_at: now },
  },
  restaurant_knowledge_suggestions: {
    defaults: { category: "general", status: "pending", times_asked: 1, created_at: now, updated_at: now },
  },
  restaurant_reservation_requests: { defaults: { status: "requested", created_at: now, updated_at: now } },
};

export function tableSpec(table: string): Required<Pick<TableSpec, "pk">> & TableSpec {
  const spec = TABLES[table] ?? {};
  return { ...spec, pk: spec.pk ?? ["id"] };
}

/** Child tables deleted when a parent row is deleted (old ON DELETE CASCADE). */
export const CASCADES: Record<string, Array<{ table: string; column: string }>> = {
  organizations: [
    { table: "memberships", column: "organization_id" },
    { table: "restaurants", column: "organization_id" },
    { table: "organization_onboarding", column: "organization_id" },
    { table: "organization_menu_templates", column: "organization_id" },
    { table: "notification_settings", column: "organization_id" },
    { table: "notification_deliveries", column: "organization_id" },
    { table: "usage_events", column: "organization_id" },
  ],
  restaurants: [
    { table: "categories", column: "restaurant_id" },
    { table: "draft_orders", column: "restaurant_id" },
    { table: "phone_order_receipts", column: "restaurant_id" },
    { table: "restaurant_profiles", column: "restaurant_id" },
    { table: "restaurant_onboarding", column: "restaurant_id" },
    { table: "restaurant_weekly_hours", column: "restaurant_id" },
    { table: "restaurant_hours_exceptions", column: "restaurant_id" },
    { table: "menu_imports", column: "restaurant_id" },
    { table: "agent_tool_idempotency", column: "restaurant_id" },
    { table: "agent_call_events", column: "restaurant_id" },
    { table: "restaurant_knowledge_entries", column: "restaurant_id" },
    { table: "restaurant_upsell_rules", column: "restaurant_id" },
    { table: "restaurant_knowledge_suggestions", column: "restaurant_id" },
    { table: "restaurant_reservation_requests", column: "restaurant_id" },
  ],
  categories: [{ table: "items", column: "category_id" }],
  items: [{ table: "modifiers", column: "item_id" }],
  profiles: [{ table: "memberships", column: "user_id" }],
};

export const DEFAULT_RESTAURANT_STEPS = {
  restaurant_profile: { status: "pending" },
  menu_import: { status: "pending" },
  voice_agent: { status: "pending" },
  test_call: { status: "pending" },
  go_live: { status: "pending" },
};
