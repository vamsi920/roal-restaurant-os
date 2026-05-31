import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveAgentCallSessions } from "@/lib/agent-calls/derive-call-sessions";
import type {
  AgentCallSession,
  DraftOrderCallRow,
  ReceiptCallRow,
  StoredCallEventRow,
  UsageCallRow,
} from "@/lib/agent-calls/types";

export type LoadRestaurantAgentCallSessionsInput = {
  restaurantId: string;
  since?: string;
  until?: string;
  limit?: number;
};

export type LoadRestaurantAgentCallSessionsResult = {
  sessions: AgentCallSession[];
  linkedAgentId: string | null;
  drafts: DraftOrderCallRow[];
  receipts: ReceiptCallRow[];
  usageEvents: UsageCallRow[];
};

export async function loadRestaurantAgentCallSessions(
  supabase: SupabaseClient,
  input: LoadRestaurantAgentCallSessionsInput
): Promise<LoadRestaurantAgentCallSessionsResult> {
  const restaurantId = input.restaurantId.trim();
  if (!restaurantId) {
    return {
      sessions: [],
      linkedAgentId: null,
      drafts: [],
      receipts: [],
      usageEvents: [],
    };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("restaurant_profiles")
    .select("elevenlabs_agent_id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (profileErr) throw new Error(profileErr.message);

  const linkedAgentId =
    profile?.elevenlabs_agent_id != null &&
    String(profile.elevenlabs_agent_id).trim()
      ? String(profile.elevenlabs_agent_id).trim()
      : null;

  let draftsQuery = supabase
    .from("draft_orders")
    .select(
      "restaurant_id, session_id, status, items, customer_name, customer_phone, fulfillment_type, delivery_address, delivery_instructions, created_at, updated_at, completed_at, canceled_at"
    )
    .eq("restaurant_id", restaurantId);

  let receiptsQuery = supabase
    .from("phone_order_receipts")
    .select(
      "restaurant_id, session_id, customer_name, customer_phone, items, fulfillment_type, delivery_address, delivery_instructions, created_at"
    )
    .eq("restaurant_id", restaurantId);

  let usageQuery = supabase
    .from("usage_events")
    .select("event_type, occurred_at, restaurant_id, session_id, metadata")
    .eq("restaurant_id", restaurantId)
    .in("event_type", ["tool_call", "voice_order", "order_completed"]);

  let storedQuery = supabase
    .from("agent_call_events")
    .select(
      "restaurant_id, agent_id, conversation_id, session_id, caller_phone, status, outcome, started_at, ended_at, transcript_metadata"
    )
    .eq("restaurant_id", restaurantId);

  if (input.since) {
    draftsQuery = draftsQuery.gte("created_at", input.since);
    receiptsQuery = receiptsQuery.gte("created_at", input.since);
    usageQuery = usageQuery.gte("occurred_at", input.since);
    storedQuery = storedQuery.gte("started_at", input.since);
  }
  if (input.until) {
    draftsQuery = draftsQuery.lte("created_at", input.until);
    receiptsQuery = receiptsQuery.lte("created_at", input.until);
    usageQuery = usageQuery.lte("occurred_at", input.until);
    storedQuery = storedQuery.lte("started_at", input.until);
  }

  const [draftsRes, receiptsRes, usageRes, storedRes] = await Promise.all([
    draftsQuery,
    receiptsQuery,
    usageQuery,
    storedQuery,
  ]);

  if (draftsRes.error) throw new Error(draftsRes.error.message);
  if (receiptsRes.error) throw new Error(receiptsRes.error.message);
  if (usageRes.error) throw new Error(usageRes.error.message);

  let storedEvents: StoredCallEventRow[] = [];
  if (storedRes.error) {
    const msg = storedRes.error.message ?? "";
    if (!/agent_call_events/i.test(msg)) {
      throw new Error(storedRes.error.message);
    }
  } else {
    storedEvents = (storedRes.data ?? []) as StoredCallEventRow[];
  }

  const sessions = deriveAgentCallSessions({
    restaurantId,
    linkedAgentId,
    drafts: (draftsRes.data ?? []) as DraftOrderCallRow[],
    receipts: (receiptsRes.data ?? []) as ReceiptCallRow[],
    usageEvents: (usageRes.data ?? []) as UsageCallRow[],
    storedEvents,
  });

  const drafts = (draftsRes.data ?? []) as DraftOrderCallRow[];
  const receipts = (receiptsRes.data ?? []) as ReceiptCallRow[];
  const usageEvents = (usageRes.data ?? []) as UsageCallRow[];

  const limit = input.limit ?? sessions.length;
  return {
    sessions: sessions.slice(0, limit),
    linkedAgentId,
    drafts,
    receipts,
    usageEvents,
  };
}
