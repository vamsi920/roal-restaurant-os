import { describe, expect, it } from "vitest";
import {
  CALLER_QUESTION_TOPIC_LABELS,
  aggregateCallerQuestionTopics,
  classifyCallerQuestionTopic,
  sanitizeQuestionSnippet,
} from "@/lib/analytics/caller-question-topics";
import type { AgentCallEventAnalyticsRow } from "@/lib/analytics/aggregate";

describe("caller question topics", () => {
  it("classifies hours, allergen, and reservation guest questions", () => {
    expect(
      classifyCallerQuestionTopic({
        transcript: [{ role: "user", message: "Are you open until 9 tonight?" }],
      })
    ).toBe("hours");

    expect(
      classifyCallerQuestionTopic({
        transcript: [
          { role: "user", message: "Do you have any nut-free options?" },
        ],
      })
    ).toBe("allergens_dietary");

    expect(
      classifyCallerQuestionTopic({
        transcript: [{ role: "user", message: "Can I book a table for four?" }],
      })
    ).toBe("reservations");
  });

  it("maps intent metadata to topics before transcript regex", () => {
    expect(classifyCallerQuestionTopic({ intent: "reservation" })).toBe(
      "reservations"
    );
    expect(classifyCallerQuestionTopic({ call_intent: "dietary" })).toBe(
      "allergens_dietary"
    );
  });

  it("redacts phone numbers in FAQ snippets", () => {
    expect(
      sanitizeQuestionSnippet("Call me at 415-555-0199 about gluten-free pasta")
    ).toBe("Call me at [phone] about gluten-free pasta");
  });

  it("aggregates no-order calls into labeled topic rows", () => {
    const events: AgentCallEventAnalyticsRow[] = [
      {
        restaurant_id: "r1",
        session_id: "s1",
        status: "ended",
        outcome: "no_order",
        started_at: "2026-05-30T17:00:00.000Z",
        ended_at: "2026-05-30T17:05:00.000Z",
        transcript_metadata: {
          transcript: [{ role: "user", message: "What are your hours today?" }],
        },
      },
      {
        restaurant_id: "r1",
        session_id: "s2",
        status: "ended",
        outcome: "no_order",
        started_at: "2026-05-30T18:00:00.000Z",
        ended_at: "2026-05-30T18:04:00.000Z",
        transcript_metadata: {
          transcript: [
            { role: "user", message: "Table for 2 on Friday at 7pm please" },
          ],
        },
      },
    ];

    const snapshot = aggregateCallerQuestionTopics(events);
    expect(snapshot.faqNoOrderCallCount).toBe(2);
    expect(snapshot.topics.find((t) => t.topicId === "hours")?.count).toBe(1);
    expect(snapshot.topics.find((t) => t.topicId === "reservations")?.count).toBe(
      1
    );
    expect(CALLER_QUESTION_TOPIC_LABELS.reservations).toBe("Reservations");
  });
});
