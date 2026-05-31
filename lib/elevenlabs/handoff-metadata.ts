function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || asString(value).toLowerCase() === "true";
}

export const HANDOFF_BOOLEAN_FLAGS = [
  "handoff_requested",
  "handoff_required",
  "manager_requested",
  "callback_requested",
  "escalation_requested",
  "catering_requested",
  "complaint_requested",
  "human_requested",
] as const;

export const HANDOFF_REASON_LABELS: Record<string, string> = {
  handoff_requested: "Staff handoff",
  handoff_required: "Staff handoff",
  manager_requested: "Manager requested",
  callback_requested: "Callback requested",
  escalation_requested: "Escalation requested",
  catering_requested: "Catering follow-up",
  catering: "Catering follow-up",
  complaint_requested: "Complaint follow-up",
  complaint: "Complaint follow-up",
  reservation_follow_up: "Reservation follow-up",
  human_requested: "Guest requested a person",
  voicemail_detected: "Voicemail left",
};

export function classifyHandoffReasonFromSummary(
  summary: string
): string | null {
  const blob = summary.toLowerCase();
  if (/\bcatering\b|large party|party of \d{2,}/.test(blob)) {
    return "catering";
  }
  if (
    /\bcomplain\w*\b|wrong order|cold food|refund|missing items|bad experience/.test(
      blob
    )
  ) {
    return "complaint";
  }
  if (/\breservation\b|book a table|table for/.test(blob)) {
    return "reservation_follow_up";
  }
  if (
    /\bmanager\b|supervisor|speak to someone|human|real person|talk to a person/.test(
      blob
    )
  ) {
    return "human_requested";
  }
  return null;
}

export function mergeHandoffTranscriptFlags(input: {
  dataCollection?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
  analysisSummary?: string | null;
}): Record<string, unknown> {
  const flags: Record<string, unknown> = {};
  const collection = input.dataCollection ?? {};
  const metadata = input.metadata ?? {};
  const data = input.data ?? {};

  const reasonByFlag: Partial<Record<(typeof HANDOFF_BOOLEAN_FLAGS)[number], string>> =
    {
      catering_requested: "catering",
      complaint_requested: "complaint",
      human_requested: "human_requested",
      manager_requested: "human_requested",
      callback_requested: "human_requested",
      escalation_requested: "human_requested",
    };

  for (const key of HANDOFF_BOOLEAN_FLAGS) {
    const raw = collection[key] ?? metadata[key] ?? data[key];
    if (isTruthyFlag(raw)) {
      flags[key] = true;
      if (!flags.handoff_reason && reasonByFlag[key]) {
        flags.handoff_reason = reasonByFlag[key];
      }
    }
  }

  const explicitReason = asString(
    collection.handoff_reason ?? metadata.handoff_reason ?? data.handoff_reason
  );
  if (explicitReason) {
    flags.handoff_requested = true;
    flags.handoff_reason = explicitReason;
  }

  const summary = asString(input.analysisSummary);
  if (summary) {
    const lower = summary.toLowerCase();
    if (
      lower.includes("manager") ||
      lower.includes("handoff") ||
      lower.includes("call back") ||
      lower.includes("callback")
    ) {
      flags.handoff_requested = true;
    }
    const inferred = classifyHandoffReasonFromSummary(summary);
    if (inferred) {
      flags.handoff_requested = true;
      if (!flags.handoff_reason) {
        flags.handoff_reason = inferred;
      }
    }
  }

  return flags;
}

export function handoffSignalsFromMetadata(
  metadata: Record<string, unknown>
): string[] {
  const signals: string[] = [];
  if (isTruthyFlag(metadata.voicemail_detected)) {
    signals.push("voicemail_detected");
  }
  for (const key of HANDOFF_BOOLEAN_FLAGS) {
    if (isTruthyFlag(metadata[key])) {
      signals.push(key);
    }
  }
  const reason = asString(metadata.handoff_reason);
  if (reason) {
    signals.push(reason);
  }
  const summary = asString(metadata.transcript_summary) || asString(metadata.summary);
  if (/handoff|human|manager|callback|catering|complaint/i.test(summary)) {
    signals.push("transcript_mention");
  }
  return signals;
}

export function staffHandoffReasonFromMetadata(
  metadata: Record<string, unknown>
): string | null {
  if (isTruthyFlag(metadata.voicemail_detected)) {
    return "voicemail_detected";
  }
  for (const key of HANDOFF_FLAG_PRIORITY) {
    if (isTruthyFlag(metadata[key])) {
      return key;
    }
  }
  const reason = asString(metadata.handoff_reason);
  return reason || null;
}

const HANDOFF_FLAG_PRIORITY: (typeof HANDOFF_BOOLEAN_FLAGS)[number][] = [
  "catering_requested",
  "complaint_requested",
  "human_requested",
  "manager_requested",
  "callback_requested",
  "escalation_requested",
  "handoff_required",
  "handoff_requested",
];

export function followUpLabelFromHandoffMetadata(
  metadata: Record<string, unknown>
): string | null {
  if (isTruthyFlag(metadata.voicemail_detected)) {
    return HANDOFF_REASON_LABELS.voicemail_detected;
  }
  for (const key of HANDOFF_FLAG_PRIORITY) {
    if (isTruthyFlag(metadata[key])) {
      return HANDOFF_REASON_LABELS[key] ?? key.replace(/_/g, " ");
    }
  }
  const reason = asString(metadata.handoff_reason);
  if (reason) {
    return HANDOFF_REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
  }
  return null;
}
