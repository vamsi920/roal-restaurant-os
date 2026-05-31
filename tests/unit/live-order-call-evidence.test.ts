import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildOrderCallEvidence,
  indexOrderCallEvidence,
} from "@/lib/live-orders/call-evidence";

const REPO = join(import.meta.dirname, "../..");

describe("live order call evidence", () => {
  it("maps stored agent call metadata into order detail evidence", () => {
    const evidence = buildOrderCallEvidence({
      session_id: "sess_1",
      conversation_id: "conv_1",
      outcome: "order_completed",
      started_at: "2026-05-30T18:00:00.000Z",
      ended_at: "2026-05-30T18:03:00.000Z",
      transcript_metadata: {
        transcript_summary: "Guest ordered two pizzas and garlic knots.",
        recording_url: "https://audio.example.com/call.mp3",
        transcript: [
          { role: "agent", message: "Thanks for calling. What can I get you?" },
          { role: "user", message: "Two pizzas for pickup." },
        ],
      },
    });

    expect(evidence).toMatchObject({
      sessionId: "sess_1",
      conversationId: "conv_1",
      outcome: "order_completed",
      transcriptSummary: "Guest ordered two pizzas and garlic knots.",
      recordingUrl: "https://audio.example.com/call.mp3",
      transcriptLines: [
        { speaker: "Agent", text: "Thanks for calling. What can I get you?" },
        { speaker: "Guest", text: "Two pizzas for pickup." },
      ],
    });
  });

  it("indexes evidence by session id and skips empty sessions", () => {
    const rows = [
      buildOrderCallEvidence({
        session_id: "sess_1",
        conversation_id: null,
        outcome: null,
        started_at: null,
        ended_at: null,
        transcript_metadata: { summary: "Call summary" },
      }),
      buildOrderCallEvidence({
        session_id: "",
        conversation_id: null,
        outcome: null,
        started_at: null,
        ended_at: null,
        transcript_metadata: null,
      }),
    ].filter(
      (row): row is NonNullable<ReturnType<typeof buildOrderCallEvidence>> =>
        row != null
    );

    expect(indexOrderCallEvidence(rows)).toEqual({
      sess_1: expect.objectContaining({
        sessionId: "sess_1",
        conversationId: "sess_1",
        transcriptSummary: "Call summary",
      }),
    });
  });

  it("keeps live dashboard evidence wired to agent call events", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain('table: "agent_call_events"');
    expect(panel).toContain("setCallEvidenceBySession");
    expect(panel).toContain("setActiveCalls");

    const migration = readFileSync(
      join(REPO, "supabase/migrations/026_agent_call_events.sql"),
      "utf8"
    );
    expect(migration).toContain("supabase_realtime");
    expect(migration).toContain("public.agent_call_events");
  });
});
