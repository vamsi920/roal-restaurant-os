import type { CommandCenterCallRow } from "@/lib/command-center/types";

export type LiveOrdersRecentOutcome = {
  kind: "failed" | "handoff" | "voicemail" | "unknown";
  sessionId: string;
  callerPhone: string | null;
  headline: string;
  detail: string | null;
  occurredAt: string;
};

function outcomeHeadline(row: CommandCenterCallRow, kind: LiveOrdersRecentOutcome["kind"]): string {
  if (kind === "voicemail") {
    return "Voicemail callback";
  }
  if (kind === "handoff") {
    return row.handoffSignals[0] ?? "Staff handoff";
  }
  if (kind === "failed") {
    if (row.outcome === "canceled") return "Order canceled";
    if (row.outcome === "abandoned") return "Cart abandoned";
    if (row.toolErrorCount > 0) return "Tool error during call";
    return row.outcome.replace(/_/g, " ");
  }
  return row.outcome === "no_order" ? "No order placed" : "Unknown outcome";
}

function outcomeDetail(row: CommandCenterCallRow, kind: LiveOrdersRecentOutcome["kind"]): string | null {
  if (kind === "handoff" && row.handoffSignals.length > 1) {
    return row.handoffSignals.slice(1).join(", ");
  }
  if (kind === "failed" && row.toolErrorCount > 0) {
    return `${row.toolErrorCount} tool error${row.toolErrorCount === 1 ? "" : "s"}`;
  }
  if (row.lineCount > 0) {
    return `${row.lineCount} item${row.lineCount === 1 ? "" : "s"} in cart`;
  }
  return null;
}

function isVoicemailOutcomeRow(row: CommandCenterCallRow): boolean {
  return row.handoffSignals.includes("voicemail_detected");
}

export function buildRecentPhoneOutcomes(input: {
  failed: CommandCenterCallRow[];
  handoff: CommandCenterCallRow[];
  unknown: CommandCenterCallRow[];
  limit?: number;
}): LiveOrdersRecentOutcome[] {
  const limit = input.limit ?? 10;
  const rows: LiveOrdersRecentOutcome[] = [];

  const handoffRows: CommandCenterCallRow[] = [];
  const voicemailRows: CommandCenterCallRow[] = [];

  for (const row of input.handoff) {
    if (isVoicemailOutcomeRow(row)) {
      voicemailRows.push(row);
    } else {
      handoffRows.push(row);
    }
  }

  for (const row of input.failed) {
    rows.push({
      kind: "failed",
      sessionId: row.sessionId,
      callerPhone: row.callerPhone,
      headline: outcomeHeadline(row, "failed"),
      detail: outcomeDetail(row, "failed"),
      occurredAt: row.lastActivityAt,
    });
  }
  for (const row of voicemailRows) {
    rows.push({
      kind: "voicemail",
      sessionId: row.sessionId,
      callerPhone: row.callerPhone,
      headline: outcomeHeadline(row, "voicemail"),
      detail: outcomeDetail(row, "handoff"),
      occurredAt: row.lastActivityAt,
    });
  }
  for (const row of handoffRows) {
    rows.push({
      kind: "handoff",
      sessionId: row.sessionId,
      callerPhone: row.callerPhone,
      headline: outcomeHeadline(row, "handoff"),
      detail: outcomeDetail(row, "handoff"),
      occurredAt: row.lastActivityAt,
    });
  }
  for (const row of input.unknown) {
    rows.push({
      kind: "unknown",
      sessionId: row.sessionId,
      callerPhone: row.callerPhone,
      headline: outcomeHeadline(row, "unknown"),
      detail: outcomeDetail(row, "unknown"),
      occurredAt: row.lastActivityAt,
    });
  }

  return rows
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
    .slice(0, limit);
}
