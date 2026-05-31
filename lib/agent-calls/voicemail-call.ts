function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || asString(value).toLowerCase() === "true";
}

function metadataBlob(metadata: Record<string, unknown>): string {
  const analysis =
    metadata.analysis && typeof metadata.analysis === "object" && !Array.isArray(metadata.analysis)
      ? (metadata.analysis as Record<string, unknown>)
      : {};
  const collection =
    analysis.data_collection_results &&
    typeof analysis.data_collection_results === "object" &&
    !Array.isArray(analysis.data_collection_results)
      ? (analysis.data_collection_results as Record<string, unknown>)
      : {};

  return [
    metadata.transcript_summary,
    metadata.summary,
    metadata.termination_reason,
    analysis.transcript_summary,
    collection.callback_reason,
    collection.voicemail_reason,
    collection.handoff_reason,
  ]
    .map(asString)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function isVoicemailTranscriptMetadata(
  metadata: Record<string, unknown>
): boolean {
  if (isTruthyFlag(metadata.voicemail_detected)) return true;
  const blob = metadataBlob(metadata);
  return (
    blob.includes("voicemail") ||
    blob.includes("voice mail") ||
    blob.includes("left a message") ||
    blob.includes("leave a message")
  );
}

export function voicemailCallbackReasonFromMetadata(
  metadata: Record<string, unknown>
): string | null {
  const analysis =
    metadata.analysis && typeof metadata.analysis === "object" && !Array.isArray(metadata.analysis)
      ? (metadata.analysis as Record<string, unknown>)
      : {};
  const collection =
    analysis.data_collection_results &&
    typeof analysis.data_collection_results === "object" &&
    !Array.isArray(analysis.data_collection_results)
      ? (analysis.data_collection_results as Record<string, unknown>)
      : {};

  return (
    asString(collection.callback_reason) ||
    asString(collection.voicemail_reason) ||
    asString(collection.handoff_reason) ||
    asString(metadata.follow_up_reason) ||
    asString(metadata.transcript_summary) ||
    asString(analysis.transcript_summary) ||
    null
  );
}

export function callerContactFromTranscriptMetadata(
  metadata: Record<string, unknown>
): { callerName: string | null; callerPhone: string | null } {
  const analysis =
    metadata.analysis && typeof metadata.analysis === "object" && !Array.isArray(metadata.analysis)
      ? (metadata.analysis as Record<string, unknown>)
      : {};
  const collection =
    analysis.data_collection_results &&
    typeof analysis.data_collection_results === "object" &&
    !Array.isArray(analysis.data_collection_results)
      ? (analysis.data_collection_results as Record<string, unknown>)
      : {};

  return {
    callerName:
      asString(collection.caller_name) ||
      asString(collection.customer_name) ||
      asString(metadata.caller_name) ||
      asString(metadata.customer_name) ||
      null,
    callerPhone:
      asString(collection.callback_phone) ||
      asString(collection.customer_phone) ||
      asString(metadata.callback_phone) ||
      asString(metadata.customer_phone) ||
      null,
  };
}

/** Voicemail and callback-only calls must never be treated as completed orders. */
export function outcomeForVoicemailAwareCall(input: {
  transcriptMetadata: Record<string, unknown>;
  receipt: { session_id: string } | null;
  inferredOutcome: string;
}): string {
  if (input.receipt) return input.inferredOutcome;
  if (!isVoicemailTranscriptMetadata(input.transcriptMetadata)) {
    return input.inferredOutcome;
  }
  if (input.inferredOutcome === "order_completed") return "no_order";
  return input.inferredOutcome;
}
