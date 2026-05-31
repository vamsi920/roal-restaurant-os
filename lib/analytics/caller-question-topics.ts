import type { AgentCallEventAnalyticsRow } from "@/lib/analytics/aggregate";
import { resolveAnalyticsCallOutcome } from "@/lib/analytics/aggregate";

export type CallerQuestionTopicId =
  | "hours"
  | "menu"
  | "allergens_dietary"
  | "delivery"
  | "pickup_wait_time"
  | "order_status"
  | "reservations"
  | "catering"
  | "directions_location"
  | "pricing_promos"
  | "other";

export type CallerQuestionTopicRow = {
  topicId: CallerQuestionTopicId;
  label: string;
  count: number;
  percentOfFaqCalls: number | null;
  exampleSnippets: string[];
};

export type CallerQuestionTopicsSnapshot = {
  faqNoOrderCallCount: number;
  topics: CallerQuestionTopicRow[];
};

export const CALLER_QUESTION_TOPIC_LABELS: Record<CallerQuestionTopicId, string> = {
  hours: "Hours & open/closed",
  menu: "Menu items",
  allergens_dietary: "Allergens & dietary",
  delivery: "Delivery",
  pickup_wait_time: "Pickup / wait time",
  order_status: "Order status",
  reservations: "Reservations",
  catering: "Catering",
  directions_location: "Directions & location",
  pricing_promos: "Pricing & promos",
  other: "Other questions",
};

const TOPIC_MATCHERS: Array<{ id: CallerQuestionTopicId; patterns: RegExp[] }> = [
  {
    id: "order_status",
    patterns: [
      /\border status\b/,
      /\bwhere is my order\b/,
      /\bis (?:it|my order) ready\b/,
      /\bready yet\b/,
      /\bpickup status\b/,
      /\btrack(?:ing)? (?:my )?order\b/,
    ],
  },
  {
    id: "reservations",
    patterns: [
      /\breservation\b/,
      /\bbook a table\b/,
      /\btable for\b/,
      /\bparty of\b/,
      /\breserve a table\b/,
    ],
  },
  {
    id: "catering",
    patterns: [
      /\bcatering\b/,
      /\blarge order\b/,
      /\bparty tray\b/,
      /\bevent order\b/,
      /\btray order\b/,
    ],
  },
  {
    id: "allergens_dietary",
    patterns: [
      /\ballergen\b/,
      /\ballerg(y|ic)\b/,
      /\bgluten[- ]free\b/,
      /\bnut[- ]free\b/,
      /\bdairy[- ]free\b/,
      /\bvegan\b/,
      /\bvegetarian\b/,
      /\bhalal\b/,
      /\bkosher\b/,
      /\bdietary\b/,
    ],
  },
  {
    id: "delivery",
    patterns: [
      /\bdelivery\b/,
      /\bdeliver to\b/,
      /\bdelivery address\b/,
      /\bdo you deliver\b/,
    ],
  },
  {
    id: "pickup_wait_time",
    patterns: [
      /\bwait time\b/,
      /\bprep time\b/,
      /\bhow long\b/,
      /\bpickup time\b/,
      /\bready in\b/,
      /\bwhen will (?:it|my order) be ready\b/,
    ],
  },
  {
    id: "hours",
    patterns: [
      /\bhours\b/,
      /\bopen today\b/,
      /\bclose(?:d|s)? (?:at|today|on)\b/,
      /\bwhat time (?:do you|are you) open\b/,
      /\bare you open\b/,
      /\bwhen do you (?:open|close)\b/,
    ],
  },
  {
    id: "directions_location",
    patterns: [
      /\bdirections\b/,
      /\bwhere are you located\b/,
      /\bwhat(?:'s| is) (?:your )?address\b/,
      /\bfind the restaurant\b/,
      /\bparking\b/,
      /\blocated at\b/,
    ],
  },
  {
    id: "pricing_promos",
    patterns: [
      /\bhow much\b/,
      /\bprice\b/,
      /\bdiscount\b/,
      /\bpromo\b/,
      /\bcoupon\b/,
      /\bspecial(?:s)?\b/,
      /\bdeal\b/,
    ],
  },
  {
    id: "menu",
    patterns: [
      /\bmenu\b/,
      /\bwhat do you (?:have|serve|offer)\b/,
      /\bingredients\b/,
      /\bdo you have\b/,
      /\bwhat(?:'s| is) in\b/,
      /\bdish\b/,
    ],
  },
];

const INTENT_TOPIC_MAP: Record<string, CallerQuestionTopicId> = {
  hours: "hours",
  open_hours: "hours",
  restaurant_hours: "hours",
  menu: "menu",
  menu_question: "menu",
  allergen: "allergens_dietary",
  allergy: "allergens_dietary",
  dietary: "allergens_dietary",
  delivery: "delivery",
  wait_time: "pickup_wait_time",
  pickup_time: "pickup_wait_time",
  order_status: "order_status",
  reservation: "reservations",
  reservations: "reservations",
  catering: "catering",
  directions: "directions_location",
  location: "directions_location",
  address: "directions_location",
  pricing: "pricing_promos",
  promo: "pricing_promos",
};

const PHONE_PATTERN =
  /(?:\+?\d[\d\s().-]{7,}\d|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b)/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const CARD_PATTERN = /\b(?:\d[ -]?){13,19}\b/g;

const SNIPPET_MAX_LEN = 120;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function collectMetadataStrings(metadata: Record<string, unknown>): string[] {
  const pieces: unknown[] = [
    metadata.transcript_summary,
    metadata.summary,
    metadata.intent,
    metadata.call_intent,
    metadata.call_type,
  ];

  const analysis = metadata.analysis;
  if (analysis && typeof analysis === "object" && !Array.isArray(analysis)) {
    const row = analysis as Record<string, unknown>;
    pieces.push(row.transcript_summary, row.call_intent, row.intent);
    const collection = row.data_collection_results;
    if (collection && typeof collection === "object" && !Array.isArray(collection)) {
      for (const value of Object.values(collection as Record<string, unknown>)) {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          pieces.push(String(value));
        }
      }
    }
  }

  const dataCollection = metadata.data_collection_results;
  if (
    dataCollection &&
    typeof dataCollection === "object" &&
    !Array.isArray(dataCollection)
  ) {
    for (const value of Object.values(dataCollection as Record<string, unknown>)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        pieces.push(String(value));
      }
    }
  }

  return pieces.map(asString).filter(Boolean);
}

export function buildCallerQuestionBlob(metadata: Record<string, unknown>): string {
  const pieces = collectMetadataStrings(metadata);

  const transcript = metadata.transcript;
  if (Array.isArray(transcript)) {
    for (const turn of transcript.slice(0, 24)) {
      if (!turn || typeof turn !== "object" || Array.isArray(turn)) continue;
      const row = turn as Record<string, unknown>;
      const role = asString(row.role ?? row.speaker ?? row.type).toLowerCase();
      if (role.includes("tool")) continue;
      pieces.push(
        asString(row.message) ||
          asString(row.text) ||
          asString(row.content) ||
          asString(row.transcript)
      );
    }
  }

  return pieces.join(" ").toLowerCase();
}

function topicFromIntentHints(metadata: Record<string, unknown>): CallerQuestionTopicId | null {
  for (const raw of collectMetadataStrings(metadata)) {
    const key = raw.toLowerCase().replace(/[\s-]+/g, "_");
    const mapped = INTENT_TOPIC_MAP[key];
    if (mapped) return mapped;
  }
  return null;
}

export function classifyCallerQuestionTopic(
  metadata: Record<string, unknown>
): CallerQuestionTopicId {
  const fromIntent = topicFromIntentHints(metadata);
  if (fromIntent) return fromIntent;

  const blob = buildCallerQuestionBlob(metadata);
  if (!blob) return "other";

  for (const matcher of TOPIC_MATCHERS) {
    if (matcher.patterns.some((pattern) => pattern.test(blob))) {
      return matcher.id;
    }
  }

  return "other";
}

export function sanitizeQuestionSnippet(text: string): string {
  let sanitized = text
    .replace(PHONE_PATTERN, "[phone]")
    .replace(EMAIL_PATTERN, "[email]")
    .replace(CARD_PATTERN, "[card]")
    .replace(/\s+/g, " ")
    .trim();

  if (sanitized.length > SNIPPET_MAX_LEN) {
    sanitized = `${sanitized.slice(0, SNIPPET_MAX_LEN - 1).trim()}…`;
  }

  return sanitized;
}

function guestSnippetCandidates(metadata: Record<string, unknown>): string[] {
  const candidates: string[] = [];

  for (const raw of [metadata.transcript_summary, metadata.summary]) {
    const text = asString(raw);
    if (text) candidates.push(text);
  }

  const analysis = metadata.analysis;
  if (analysis && typeof analysis === "object" && !Array.isArray(analysis)) {
    const summary = asString((analysis as Record<string, unknown>).transcript_summary);
    if (summary) candidates.push(summary);
  }

  const transcript = metadata.transcript;
  if (Array.isArray(transcript)) {
    for (const turn of transcript) {
      if (!turn || typeof turn !== "object" || Array.isArray(turn)) continue;
      const row = turn as Record<string, unknown>;
      const role = asString(row.role ?? row.speaker ?? row.type).toLowerCase();
      if (
        role.includes("user") ||
        role.includes("customer") ||
        role.includes("guest") ||
        role.includes("caller")
      ) {
        const text =
          asString(row.message) ||
          asString(row.text) ||
          asString(row.content) ||
          asString(row.transcript);
        if (text) candidates.push(text);
      }
    }
  }

  return candidates;
}

export function extractQuestionSnippets(
  metadata: Record<string, unknown>,
  limit = 2
): string[] {
  const seen = new Set<string>();
  const snippets: string[] = [];

  for (const candidate of guestSnippetCandidates(metadata)) {
    const sanitized = sanitizeQuestionSnippet(candidate);
    if (!sanitized || seen.has(sanitized.toLowerCase())) continue;
    seen.add(sanitized.toLowerCase());
    snippets.push(sanitized);
    if (snippets.length >= limit) break;
  }

  return snippets;
}

function faqPercent(count: number, faqTotal: number): number | null {
  if (faqTotal <= 0) return null;
  return Math.min(100, Math.round((count / faqTotal) * 100));
}

export function aggregateCallerQuestionTopics(
  events: AgentCallEventAnalyticsRow[],
  receiptSessionKeys: Set<string> = new Set()
): CallerQuestionTopicsSnapshot {
  const faqEvents = events.filter(
    (event) => resolveAnalyticsCallOutcome(event, receiptSessionKeys) === "no_order"
  );

  const counts = new Map<CallerQuestionTopicId, number>();
  const examples = new Map<CallerQuestionTopicId, string[]>();

  for (const event of faqEvents) {
    const metadata = event.transcript_metadata ?? {};
    const topicId = classifyCallerQuestionTopic(metadata);
    counts.set(topicId, (counts.get(topicId) ?? 0) + 1);

    const snippets = extractQuestionSnippets(metadata);
    if (snippets.length === 0) continue;

    const existing = examples.get(topicId) ?? [];
    for (const snippet of snippets) {
      if (existing.length >= 2) break;
      if (existing.some((row) => row.toLowerCase() === snippet.toLowerCase())) continue;
      existing.push(snippet);
    }
    examples.set(topicId, existing);
  }

  const faqNoOrderCallCount = faqEvents.length;
  const topics = [...counts.entries()]
    .map(([topicId, count]) => ({
      topicId,
      label: CALLER_QUESTION_TOPIC_LABELS[topicId],
      count,
      percentOfFaqCalls: faqPercent(count, faqNoOrderCallCount),
      exampleSnippets: examples.get(topicId) ?? [],
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return { faqNoOrderCallCount, topics };
}
