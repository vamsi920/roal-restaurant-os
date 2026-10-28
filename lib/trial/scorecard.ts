import type {
  TrialScorecard,
  TrialScorecardItemId,
  TrialTranscriptTurn,
} from "@/lib/trial/types";

export type TrialScorecardItem = {
  id: TrialScorecardItemId;
  label: string;
  hint: string;
};

/** Guided test-call checklist (auto-ticks from the transcript). */
export const TRIAL_SCORECARD_ITEMS: readonly TrialScorecardItem[] = [
  { id: "greeted", label: "Host greeted you", hint: "Happens as soon as the call connects." },
  { id: "menu_question", label: "Asked about the menu", hint: "Try: “What do you have that’s vegetarian?”" },
  { id: "placed_order", label: "Placed a pickup order", hint: "Order two things and give a name." },
  { id: "modifier", label: "Changed an item", hint: "Try: “Make that extra spicy” or “no onions”." },
  { id: "hours_question", label: "Asked about hours", hint: "Try: “What time do you close tonight?”" },
  { id: "ask_for_person", label: "Asked for a person", hint: "Try: “Can I talk to the manager?”" },
] as const;

const ORDER_WORDS = /\b(i'?d like|i want|can i get|can i have|let me get|i'?ll take|i'?ll have|order|get me|give me|two|three|one of)\b/i;
const MENU_WORDS = /\b(menu|vegetarian|vegan|gluten|spicy|what do you have|what kind|do you have|special|recommend|popular|price|how much)\b/i;
const MOD_WORDS = /\b(no |without|extra|add |on the side|instead|swap|change|make it|make that|hold the|light on|well done|medium|rare)\b/i;
const HOURS_WORDS = /\b(open|close|closing|hours|what time|until when|today|tonight|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
const PERSON_WORDS = /\b(manager|owner|real person|human|someone|staff|speak to|talk to|transfer)\b/i;

export function scoreTranscript(
  turns: readonly TrialTranscriptTurn[],
  previous: TrialScorecard = {}
): TrialScorecard {
  const next: TrialScorecard = { ...previous };
  if (turns.some((t) => t.role === "agent")) next.greeted = true;
  for (const t of turns) {
    if (t.role !== "user") continue;
    const text = t.text;
    if (MENU_WORDS.test(text)) next.menu_question = true;
    if (ORDER_WORDS.test(text)) next.placed_order = true;
    if (MOD_WORDS.test(text)) next.modifier = true;
    if (HOURS_WORDS.test(text)) next.hours_question = true;
    if (PERSON_WORDS.test(text)) next.ask_for_person = true;
  }
  return next;
}

export function scorecardProgress(scorecard: TrialScorecard): { done: number; total: number } {
  const done = TRIAL_SCORECARD_ITEMS.filter((i) => scorecard[i.id]).length;
  return { done, total: TRIAL_SCORECARD_ITEMS.length };
}
