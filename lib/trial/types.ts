import type { ScannedMenu } from "@/lib/menu-import/types";
import type { WeeklyHourInput } from "@/lib/restaurant-hours/core";
import type { PlaceProfileFields } from "@/lib/restaurant-lookup/types";

export type TrialSourceKind = "website" | "maps" | "name_city" | "manual";

export type TrialStatus = "resolving" | "ready" | "failed" | "claimed";

export type TrialStepId = "listing" | "menu" | "agent";

export type TrialStepStatus = "pending" | "running" | "done" | "skipped" | "failed";

export type TrialStepLogEntry = {
  id: TrialStepId;
  status: TrialStepStatus;
  title: string;
  detail: string | null;
  at: string;
};

/** "web_search": found off-site (ordering page, menu directory, PDF or photo). */
export type TrialMenuSource = "website" | "menu_url" | "upload" | "web_search" | "sample";

export type TrialPersona = {
  agentName: string;
  voiceId: string;
  voiceLabel: string;
  language: string;
};

export type TrialKnowledgeEntry = {
  category: "general" | "hours" | "menu" | "allergens" | "directions" | "policies" | "handoff";
  question: string;
  answer: string;
};

export type TrialTranscriptTurn = {
  role: "agent" | "user";
  text: string;
  at: number;
};

export type TrialScorecardItemId =
  | "greeted"
  | "menu_question"
  | "placed_order"
  | "modifier"
  | "hours_question"
  | "ask_for_person";

export type TrialScorecard = Partial<Record<TrialScorecardItemId, boolean>>;

export type TrialProfile = PlaceProfileFields & {
  cuisine: string | null;
  tagline: string | null;
};

export type TrialRecord = {
  id: string;
  status: TrialStatus;
  source_kind: TrialSourceKind;
  source_input: string;
  step_log: TrialStepLogEntry[];
  restaurant_name: string | null;
  profile: TrialProfile | null;
  weekly_hours: WeeklyHourInput[] | null;
  menu: ScannedMenu | null;
  menu_source: TrialMenuSource | null;
  menu_source_url: string | null;
  knowledge: TrialKnowledgeEntry[];
  persona: Partial<TrialPersona>;
  prompt: string | null;
  greeting: string | null;
  place_id: string | null;
  transcript: TrialTranscriptTurn[] | null;
  scorecard: TrialScorecard;
  call_count: number;
  claimed_restaurant_id: string | null;
  claimed_organization_id: string | null;
  claimed_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

/** Safe-for-client projection of a trial. */
export type TrialPublicView = {
  id: string;
  status: TrialStatus;
  sourceKind: TrialSourceKind;
  sourceInput: string;
  steps: TrialStepLogEntry[];
  restaurantName: string | null;
  profile: TrialProfile | null;
  hours: WeeklyHourInput[] | null;
  menuSummary: {
    source: TrialMenuSource | null;
    sourceUrl: string | null;
    categoryCount: number;
    itemCount: number;
    sampleItems: Array<{ name: string; price: number | null; category: string }>;
    /** Every item (capped) for the expandable menu view. */
    allItems: Array<{ name: string; price: number | null; category: string }>;
  } | null;
  knowledge: TrialKnowledgeEntry[];
  persona: TrialPersona;
  greeting: string | null;
  scorecard: TrialScorecard;
  callCount: number;
  claimedRestaurantId: string | null;
  error: string | null;
  expiresAt: string;
};
