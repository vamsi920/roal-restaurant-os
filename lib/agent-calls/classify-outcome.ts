import { isVoicemailTranscriptMetadata } from "@/lib/agent-calls/voicemail-call";
import { parseOrderLineItems } from "@/lib/orders/line-items";
import type {
  AgentCallOutcome,
  AgentCallStatus,
  DraftOrderCallRow,
  ReceiptCallRow,
  UsageCallRow,
} from "@/lib/agent-calls/types";

export function lineCountFromItems(items: unknown): number {
  return parseOrderLineItems(items).reduce(
    (sum, line) => sum + Math.max(1, line.quantity),
    0
  );
}

function usageLineCount(events: UsageCallRow[]): number {
  let max = 0;
  for (const event of events) {
    const meta = event.metadata ?? {};
    const count = Number(meta.line_count);
    if (Number.isFinite(count) && count > max) max = count;
  }
  return max;
}

function usageHadCartActivity(events: UsageCallRow[]): boolean {
  return events.some((e) => {
    if (e.event_type === "voice_order") return true;
    if (e.event_type !== "tool_call") return false;
    const tool = String((e.metadata ?? {}).tool ?? "");
    return tool === "sync_draft_order" || tool === "finalize_order";
  });
}

export function classifyAgentCallOutcome(input: {
  draft: DraftOrderCallRow | null;
  receipt: ReceiptCallRow | null;
  usage: UsageCallRow[];
  transcriptMetadata?: Record<string, unknown>;
  now: Date;
  abandonedAfterMs: number;
}): AgentCallOutcome {
  const { draft, receipt, usage } = input;

  if (
    !receipt &&
    input.transcriptMetadata &&
    isVoicemailTranscriptMetadata(input.transcriptMetadata)
  ) {
    return "no_order";
  }

  if (receipt) return "order_completed";
  if (draft?.canceled_at || draft?.status === "canceled") return "canceled";

  if (draft) {
    if (draft.status === "canceled") return "canceled";
    if (
      draft.status === "completed" &&
      lineCountFromItems(draft.items) > 0
    ) {
      return "order_completed";
    }

    const lines = lineCountFromItems(draft.items);
    const usageLines = usageLineCount(usage);
    const hasCart = lines > 0 || usageLines > 0;

    if (hasCart) {
      const lastTouch = new Date(
        draft.updated_at || draft.created_at
      ).getTime();
      if (input.now.getTime() - lastTouch >= input.abandonedAfterMs) {
        return "abandoned";
      }
      return "in_progress";
    }
  }

  if (usageHadCartActivity(usage)) {
    const lastUsage = usage.reduce((max, e) => {
      const t = new Date(e.occurred_at).getTime();
      return t > max ? t : max;
    }, 0);
    if (lastUsage && input.now.getTime() - lastUsage >= input.abandonedAfterMs) {
      return "abandoned";
    }
    return "in_progress";
  }

  if (usage.some((e) => e.event_type === "tool_call")) return "no_order";

  return "unknown";
}

export function resolveAgentCallStatus(input: {
  outcome: AgentCallOutcome;
  lastActivityAt: string | null;
  now: Date;
  activeWithinMs: number;
}): AgentCallStatus {
  if (input.outcome === "in_progress" && input.lastActivityAt) {
    const last = new Date(input.lastActivityAt).getTime();
    if (input.now.getTime() - last < input.activeWithinMs) return "active";
    return "ended";
  }

  if (input.outcome === "in_progress") return "active";

  return "ended";
}
