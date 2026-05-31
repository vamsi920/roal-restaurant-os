import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentCallOutcome } from "@/lib/agent-calls/types";
import {
  callerContactFromTranscriptMetadata,
  voicemailCallbackReasonFromMetadata,
} from "@/lib/agent-calls/voicemail-call";
import {
  HANDOFF_REASON_LABELS,
  staffHandoffReasonFromMetadata,
} from "@/lib/elevenlabs/handoff-metadata";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { shouldSkipProductionOwnerNotification } from "@/lib/notifications/session-guard";
import type { NotificationEventType } from "@/lib/notifications/types";
import { writeAuditLog } from "@/lib/observability/audit";

type RestaurantContext = {
  organizationId: string;
  restaurantId: string;
  restaurantName: string;
};

async function loadRestaurantContext(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<RestaurantContext | null> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, organization_id")
    .eq("id", restaurantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.organization_id) return null;

  return {
    organizationId: data.organization_id as string,
    restaurantId: data.id as string,
    restaurantName: (data.name as string) || "Restaurant",
  };
}

function callerPhoneLabel(input: {
  callerPhone?: string | null;
  transcriptMetadata?: Record<string, unknown>;
}): string {
  const fromMetadata = callerContactFromTranscriptMetadata(
    input.transcriptMetadata ?? {}
  ).callerPhone;
  const phone = input.callerPhone?.trim() || fromMetadata?.trim() || null;
  if (phone) return phone;
  return "Callback number was not captured on the call";
}

function summaryFromMetadata(metadata: Record<string, unknown>): string | null {
  const reason = voicemailCallbackReasonFromMetadata(metadata);
  if (reason?.trim()) return reason.trim();
  const summary =
    typeof metadata.transcript_summary === "string"
      ? metadata.transcript_summary.trim()
      : "";
  return summary || null;
}

async function emitPhoneFollowUp(
  supabase: SupabaseClient,
  input: {
    ctx: RestaurantContext;
    eventType: NotificationEventType;
    title: string;
    body: string;
    idempotencyKey: string;
    payload?: Record<string, unknown>;
    auditAction: string;
    auditMetadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  const notified = await dispatchNotification(supabase, {
    organizationId: input.ctx.organizationId,
    restaurantId: input.ctx.restaurantId,
    restaurantName: input.ctx.restaurantName,
    eventType: input.eventType,
    title: input.title,
    body: input.body.slice(0, 500),
    payload: input.payload,
    idempotencyKey: input.idempotencyKey,
  });

  if (!notified) return false;

  void writeAuditLog(supabase, {
    organizationId: input.ctx.organizationId,
    restaurantId: input.ctx.restaurantId,
    action: input.auditAction,
    resourceType: "agent_call_event",
    resourceId: String(input.payload?.session_id ?? input.ctx.restaurantId),
    outcome: "success",
    metadata: {
      event_type: input.eventType,
      ...input.auditMetadata,
    },
  });

  return true;
}

export async function emitVoicemailCallbackNotification(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    sessionId: string;
    conversationId?: string | null;
    callerPhone?: string | null;
    outcome?: string | null;
    variant: "voicemail" | "callback";
    transcriptMetadata: Record<string, unknown>;
  }
): Promise<boolean> {
  if (
    shouldSkipProductionOwnerNotification(input.sessionId, input.transcriptMetadata)
  ) {
    return false;
  }

  const ctx = await loadRestaurantContext(supabase, input.restaurantId);
  if (!ctx) return false;

  const phoneLabel = callerPhoneLabel({
    callerPhone: input.callerPhone,
    transcriptMetadata: input.transcriptMetadata,
  });
  const summary = summaryFromMetadata(input.transcriptMetadata);
  const kind =
    input.variant === "callback" ? "Callback requested" : "Voicemail left";
  const nextAction =
    phoneLabel.includes("not captured")
      ? "Next: review the recording or caller ID and call the guest back."
      : "Next: call the guest back at the number above.";
  const body = summary
    ? `${kind}. ${phoneLabel}. ${summary} ${nextAction}`
    : `${kind}. ${phoneLabel}. ${nextAction}`;

  return emitPhoneFollowUp(supabase, {
    ctx,
    eventType: "voicemail_callback",
    title: `${kind} · ${ctx.restaurantName}`,
    body,
    idempotencyKey: `voicemail_callback:${ctx.restaurantId}:${input.sessionId}`,
    payload: {
      session_id: input.sessionId,
      conversation_id: input.conversationId ?? input.sessionId,
      caller_phone: input.callerPhone ?? null,
      variant: input.variant,
      outcome: input.outcome ?? null,
      transcript_summary: summary,
    },
    auditAction: "voice_agent.voicemail_callback",
    auditMetadata: {
      variant: input.variant,
      caller_phone: input.callerPhone ?? null,
    },
  });
}

export async function emitCateringInquiryNotification(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    sessionId: string;
    conversationId?: string | null;
    callerPhone?: string | null;
    reason?: string | null;
    summary?: string | null;
    transcriptMetadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  if (
    shouldSkipProductionOwnerNotification(
      input.sessionId,
      input.transcriptMetadata ?? {}
    )
  ) {
    return false;
  }

  const ctx = await loadRestaurantContext(supabase, input.restaurantId);
  if (!ctx) return false;

  const phoneLabel = callerPhoneLabel({
    callerPhone: input.callerPhone,
    transcriptMetadata: input.transcriptMetadata ?? {},
  });
  const reason =
    input.reason?.trim() ||
    HANDOFF_REASON_LABELS.catering_requested ||
    "Catering inquiry";
  const summary = input.summary?.trim();
  const body = summary
    ? `Catering inquiry from ${phoneLabel} (${reason}): ${summary} Next: review details and call the guest back with options.`
    : `Catering inquiry from ${phoneLabel} (${reason}). Next: review details and call the guest back with options.`;

  return emitPhoneFollowUp(supabase, {
    ctx,
    eventType: "catering_inquiry",
    title: `Catering inquiry · ${ctx.restaurantName}`,
    body,
    idempotencyKey: `catering_inquiry:${ctx.restaurantId}:${input.sessionId}`,
    payload: {
      session_id: input.sessionId,
      conversation_id: input.conversationId ?? input.sessionId,
      caller_phone: input.callerPhone ?? null,
      reason,
      transcript_summary: summary ?? null,
    },
    auditAction: "voice_agent.catering_inquiry",
  });
}

export async function emitComplaintCallerNotification(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    sessionId: string;
    conversationId?: string | null;
    callerPhone?: string | null;
    reason?: string | null;
    summary?: string | null;
    transcriptMetadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  if (
    shouldSkipProductionOwnerNotification(
      input.sessionId,
      input.transcriptMetadata ?? {}
    )
  ) {
    return false;
  }

  const ctx = await loadRestaurantContext(supabase, input.restaurantId);
  if (!ctx) return false;

  const phoneLabel = callerPhoneLabel({
    callerPhone: input.callerPhone,
    transcriptMetadata: input.transcriptMetadata ?? {},
  });
  const reason =
    input.reason?.trim() ||
    HANDOFF_REASON_LABELS.complaint_requested ||
    "Unhappy caller";
  const summary = input.summary?.trim();
  const body = summary
    ? `Unhappy caller (${reason}) — ${phoneLabel}: ${summary} Next: call the guest back or escalate to a manager.`
    : `Unhappy caller (${reason}) — ${phoneLabel}. Next: call the guest back or escalate to a manager.`;

  return emitPhoneFollowUp(supabase, {
    ctx,
    eventType: "complaint_caller",
    title: `Complaint follow-up · ${ctx.restaurantName}`,
    body,
    idempotencyKey: `complaint_caller:${ctx.restaurantId}:${input.sessionId}`,
    payload: {
      session_id: input.sessionId,
      conversation_id: input.conversationId ?? input.sessionId,
      caller_phone: input.callerPhone ?? null,
      reason,
      transcript_summary: summary ?? null,
    },
    auditAction: "voice_agent.complaint_caller",
  });
}

export async function emitCallReviewNeededNotification(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    sessionId: string;
    conversationId?: string | null;
    callerPhone?: string | null;
    outcome?: AgentCallOutcome | string | null;
    eventType?: string | null;
    transcriptMetadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  if (
    shouldSkipProductionOwnerNotification(
      input.sessionId,
      input.transcriptMetadata ?? {}
    )
  ) {
    return false;
  }

  const ctx = await loadRestaurantContext(supabase, input.restaurantId);
  if (!ctx) return false;

  const phoneLabel = callerPhoneLabel({
    callerPhone: input.callerPhone,
    transcriptMetadata: input.transcriptMetadata ?? {},
  });
  const trigger =
    input.eventType === "call_initiation_failure"
      ? "Call failed to connect"
      : "Call ended without an order";
  const body = `${trigger} (${phoneLabel}). Next: review the call recording and follow up if needed.`;

  return emitPhoneFollowUp(supabase, {
    ctx,
    eventType: "call_review_needed",
    title: `Call needs review · ${ctx.restaurantName}`,
    body,
    idempotencyKey: `call_review_needed:${ctx.restaurantId}:${input.sessionId}`,
    payload: {
      session_id: input.sessionId,
      conversation_id: input.conversationId ?? input.sessionId,
      caller_phone: input.callerPhone ?? null,
      outcome: input.outcome ?? null,
      trigger,
    },
    auditAction: "voice_agent.call_review_needed",
  });
}

export async function emitReservationRequestNotification(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    reservationId: string;
    sessionId?: string | null;
    conversationId?: string | null;
    customerName: string;
    customerPhone: string;
    partySize: number;
    requestedDate: string;
    requestedTime: string;
    notes?: string | null;
  }
): Promise<boolean> {
  if (input.sessionId && shouldSkipProductionOwnerNotification(input.sessionId)) {
    return false;
  }

  const ctx = await loadRestaurantContext(supabase, input.restaurantId);
  if (!ctx) return false;

  const guestLabel = input.customerName.trim() || "Guest";
  const body = `Reservation request (not confirmed) for ${input.partySize} guest${input.partySize === 1 ? "" : "s"} on ${input.requestedDate} at ${input.requestedTime}. Contact ${guestLabel} at ${input.customerPhone} to confirm availability — this is a request, not a booked table.`;
  const sessionKey = input.sessionId?.trim() || input.reservationId;

  return emitPhoneFollowUp(supabase, {
    ctx,
    eventType: "reservation_request",
    title: `Reservation request · ${ctx.restaurantName}`,
    body,
    idempotencyKey: `reservation_request:${ctx.restaurantId}:${sessionKey}:${input.reservationId}`,
    payload: {
      reservation_id: input.reservationId,
      session_id: input.sessionId ?? null,
      conversation_id: input.conversationId ?? null,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      party_size: input.partySize,
      requested_date: input.requestedDate,
      requested_time: input.requestedTime,
      notes: input.notes ?? null,
      status: "requested",
    },
    auditAction: "voice_agent.reservation_request",
  });
}

export async function emitStuckActiveCallNotification(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    restaurantId: string;
    restaurantName: string;
    sessionId: string;
    conversationId?: string | null;
    callerPhone?: string | null;
    startedAt: string;
    thresholdMinutes: number;
    transcriptMetadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  if (
    shouldSkipProductionOwnerNotification(
      input.sessionId,
      input.transcriptMetadata ?? {}
    )
  ) {
    return false;
  }

  const phoneLabel = input.callerPhone?.trim() || "Unknown caller";
  const body = `Live call still in progress after ${input.thresholdMinutes} minutes (${phoneLabel}, started ${input.startedAt}). Next: check agent status or take over the line.`;

  const notified = await dispatchNotification(supabase, {
    organizationId: input.organizationId,
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    eventType: "stuck_active_call",
    title: `Stuck live call · ${input.restaurantName}`,
    body,
    payload: {
      session_id: input.sessionId,
      conversation_id: input.conversationId ?? input.sessionId,
      caller_phone: input.callerPhone ?? null,
      started_at: input.startedAt,
      threshold_minutes: input.thresholdMinutes,
    },
    idempotencyKey: `stuck_active_call:${input.restaurantId}:${input.sessionId}:${input.thresholdMinutes}`,
  });

  if (!notified) return false;

  void writeAuditLog(supabase, {
    organizationId: input.organizationId,
    restaurantId: input.restaurantId,
    action: "voice_agent.stuck_active_call",
    resourceType: "agent_call_event",
    resourceId: input.sessionId,
    outcome: "failure",
    metadata: {
      threshold_minutes: input.thresholdMinutes,
      started_at: input.startedAt,
    },
  });

  return true;
}

function isCateringReason(reason: string): boolean {
  return reason === "catering_requested" || reason === "catering";
}

function isComplaintReason(reason: string): boolean {
  return reason === "complaint_requested" || reason === "complaint";
}

export async function emitPostCallFollowUpNotifications(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    sessionId: string;
    conversationId?: string | null;
    callerPhone?: string | null;
    outcome: AgentCallOutcome;
    webhookEventType: string;
    transcriptMetadata: Record<string, unknown>;
    priorHandoffReason?: string | null;
  }
): Promise<void> {
  if (
    shouldSkipProductionOwnerNotification(input.sessionId, input.transcriptMetadata)
  ) {
    return;
  }

  const handoffReason = staffHandoffReasonFromMetadata(input.transcriptMetadata);
  const reasonChanged =
    Boolean(handoffReason) && handoffReason !== input.priorHandoffReason;
  const summary = summaryFromMetadata(input.transcriptMetadata);

  if (reasonChanged && handoffReason) {
    if (handoffReason === "voicemail_detected") {
      await emitVoicemailCallbackNotification(supabase, {
        restaurantId: input.restaurantId,
        sessionId: input.sessionId,
        conversationId: input.conversationId,
        callerPhone: input.callerPhone,
        outcome: input.outcome,
        variant: "voicemail",
        transcriptMetadata: input.transcriptMetadata,
      });
      return;
    }

    if (handoffReason === "callback_requested") {
      await emitVoicemailCallbackNotification(supabase, {
        restaurantId: input.restaurantId,
        sessionId: input.sessionId,
        conversationId: input.conversationId,
        callerPhone: input.callerPhone,
        outcome: input.outcome,
        variant: "callback",
        transcriptMetadata: input.transcriptMetadata,
      });
      return;
    }

    if (isCateringReason(handoffReason)) {
      await emitCateringInquiryNotification(supabase, {
        restaurantId: input.restaurantId,
        sessionId: input.sessionId,
        conversationId: input.conversationId,
        callerPhone: input.callerPhone,
        reason: handoffReason,
        summary,
        transcriptMetadata: input.transcriptMetadata,
      });
      return;
    }

    if (isComplaintReason(handoffReason)) {
      await emitComplaintCallerNotification(supabase, {
        restaurantId: input.restaurantId,
        sessionId: input.sessionId,
        conversationId: input.conversationId,
        callerPhone: input.callerPhone,
        reason: handoffReason,
        summary,
        transcriptMetadata: input.transcriptMetadata,
      });
      return;
    }

    const { emitStaffHandoffRequested } = await import(
      "@/lib/notifications/operational-events"
    );
    await emitStaffHandoffRequested(supabase, {
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      conversationId: input.conversationId,
      callerPhone: input.callerPhone,
      outcome: input.outcome,
      reason: handoffReason,
      summary,
      transcriptMetadata: input.transcriptMetadata,
    });
    return;
  }

  const needsReview =
    !handoffReason &&
    (input.outcome === "abandoned" ||
      input.webhookEventType === "call_initiation_failure");

  if (needsReview) {
    await emitCallReviewNeededNotification(supabase, {
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      conversationId: input.conversationId,
      callerPhone: input.callerPhone,
      outcome: input.outcome,
      eventType: input.webhookEventType,
      transcriptMetadata: input.transcriptMetadata,
    });
  }
}
