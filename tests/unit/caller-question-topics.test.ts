import { describe, expect, it } from "vitest";
import {
  CALLER_QUESTION_TOPIC_LABELS,
  aggregateCallerQuestionTopics,
  callPlacedOrder,
  classifyCallerQuestionTopic,
  ownerFriendlyCallText,
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

describe("caller question topics: owner-facing fixes", () => {
  const masalaOrder: Record<string, unknown> = {
    transcript_summary:
      "The user called Eggmania and ordered one chicken tikka masala for pickup. The agent asked about allergies and confirmed the total.",
    transcript: [
      { role: "agent", message: "Any allergies I should tell the kitchen about?" },
      { role: "user", message: "No allergies. One chicken tikka masala, extra spicy." },
    ],
  };

  it("does not treat a dish name or the host's allergy prompt as an allergen question", () => {
    expect(classifyCallerQuestionTopic(masalaOrder)).not.toBe("allergens_dietary");
    expect(
      classifyCallerQuestionTopic({
        transcript: [{ role: "user", message: "Is the chicken tikka masala very spicy?" }],
      })
    ).toBe("menu");
  });

  it("still finds real dietary questions", () => {
    for (const message of [
      "Is the naan gluten free?",
      "Does the korma have nuts?",
      "Is your chicken halal?",
      "Do you have vegan dishes?",
      "I'm allergic to dairy, what can I eat?",
    ]) {
      expect(
        classifyCallerQuestionTopic({ transcript: [{ role: "user", message }] })
      ).toBe("allergens_dietary");
    }
  });

  it("leaves calls that placed an order out of the question topics", () => {
    const base = {
      restaurant_id: "r1",
      status: "ended",
      started_at: "2026-10-28T23:00:00.000Z",
      ended_at: "2026-10-28T23:04:00.000Z",
    };
    const events: AgentCallEventAnalyticsRow[] = [
      // Order saved under a different id, matched by time.
      { ...base, session_id: "call-1", outcome: "no_order", transcript_metadata: masalaOrder },
      // Summary says the caller ordered.
      {
        ...base,
        session_id: "call-2",
        started_at: "2026-10-20T18:00:00.000Z",
        ended_at: "2026-10-20T18:03:00.000Z",
        outcome: "no_order",
        transcript_metadata: { transcript_summary: "The user ordered two samosas." },
      },
      // A real question call.
      {
        ...base,
        session_id: "call-3",
        started_at: "2026-10-21T18:00:00.000Z",
        ended_at: "2026-10-21T18:02:00.000Z",
        outcome: "no_order",
        transcript_metadata: { transcript_summary: "The user asked what hours the restaurant is open today." },
      },
    ];
    const snapshot = aggregateCallerQuestionTopics(events, new Set(), {
      receipts: [
        { restaurant_id: "r1", session_id: "auto-xyz", items: [], created_at: "2026-10-28T23:03:00.000Z" },
      ],
    });
    expect(snapshot.faqNoOrderCallCount).toBe(1);
    expect(snapshot.topics.map((t) => t.topicId)).toEqual(["hours"]);
    expect(callPlacedOrder(events[2]!, new Set(), [])).toBe(false);
    // Matched by time alone: order saved during the call under another id.
    expect(
      callPlacedOrder({ ...base, session_id: "call-9", outcome: "no_order" }, new Set(), [
        { restaurant_id: "r1", session_id: "auto-1", items: [], created_at: "2026-10-28T23:02:00.000Z" },
      ])
    ).toBe(true);
    expect(
      callPlacedOrder({ ...base, session_id: "call-9", outcome: "no_order" }, new Set(), [
        { restaurant_id: "r2", session_id: "auto-1", items: [], created_at: "2026-10-28T23:02:00.000Z" },
      ])
    ).toBe(false);
  });

  it("rewrites summaries in owner words with the host's name", () => {
    expect(
      ownerFriendlyCallText("The user asked about parking. The agent said the user can park out back.", "Maya")
    ).toBe("The caller asked about parking. Maya said the caller can park out back.");
    expect(
      ownerFriendlyCallText("The user asked if the agent could hold a table.", null)
    ).toBe("The caller asked if your host could hold a table.");
    expect(ownerFriendlyCallText("The agent explained the hours.", "")).toBe(
      "Your host explained the hours."
    );

    const snapshot = aggregateCallerQuestionTopics(
      [
        {
          restaurant_id: "r1",
          session_id: "s9",
          status: "ended",
          outcome: "no_order",
          started_at: "2026-10-21T18:00:00.000Z",
          ended_at: "2026-10-21T18:02:00.000Z",
          transcript_metadata: {
            transcript_summary: "The user asked about the hours. The agent shared them.",
          },
        },
      ],
      new Set(),
      { hostNameByRestaurant: new Map([["r1", "Maya"]]) }
    );
    expect(snapshot.topics[0]?.exampleSnippets[0]).toBe(
      "The caller asked about the hours. Maya shared them."
    );
  });
});
