/** Guided setup story for landing — illustrative timing, not a guarantee. */

export type SetupStepVisualId = "upload" | "review" | "voice" | "test" | "forward";

export const SETUP_STORY_DEMO = {
  eyebrow: "Guided pilot setup",
  title: "Typical pilot: about 20 minutes to your first test ticket",
  lead:
    "On a typical pilot call, we walk you from a menu photo to a test pickup on your kitchen screen—so you see money on the line before you forward real rush-hour rings.",
  honesty:
    "Timing is a planning guide for most single-location independents, not a guarantee. Complex menus, new phone numbers, or multi-location rollouts may take an extra session.",
  steps: [
    {
      id: "upload",
      minutes: "0–6 min",
      title: "Upload your menu photo",
      body: "Photograph your printed menu in the dashboard. ROAL turns it into items, prices, and modifier choices your team can edit.",
      operatorAction: "Drop your wall menu photo in Menu scanner",
      visual: "upload" as SetupStepVisualId,
    },
    {
      id: "review",
      minutes: "6–12 min",
      title: "Review before you go live",
      body: "Fix anything the scan flagged—missing prices, duplicate categories, or modifier rules—so the phone line and kitchen screen stay aligned.",
      operatorAction: "Confirm prices and modifier groups, then commit",
      visual: "review" as SetupStepVisualId,
    },
    {
      id: "voice",
      minutes: "12–16 min",
      title: "Connect your pickup line",
      body: "Link your pickup line to ROAL. Calls read your live menu—not a script from last season.",
      operatorAction: "Connect phone ordering and run a quick check",
      visual: "voice" as SetupStepVisualId,
    },
    {
      id: "test",
      minutes: "16–18 min",
      title: "Run a test order",
      body: "Place a test call, build a cart, and watch the ticket land on your kitchen screen while the “guest” is still on the line.",
      operatorAction: "Call your test line and watch the pass",
      visual: "test" as SetupStepVisualId,
    },
    {
      id: "forward",
      minutes: "18–20 min",
      title: "Forward overflow calls",
      body: "When you are ready, send rush-hour rings to ROAL. Your team runs confirmed pickups from the same screen they already trust.",
      operatorAction: "Forward your restaurant line when ready",
      visual: "forward" as SetupStepVisualId,
    },
  ],
  callout: {
    title: "We stay on the call for pilots",
    body: "You are not installing a black box. A guided session covers menu review, a test call, and what counts as a billable order before you take guest traffic.",
  },
} as const;
