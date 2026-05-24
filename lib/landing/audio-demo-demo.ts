/** Audio demo CTA — scenarios; set hasAudio when sample files ship. */

export type AudioDemoScenarioId = "pizza" | "cafe" | "diner" | "late-night";

export type AudioDemoScenario = {
  id: AudioDemoScenarioId;
  title: string;
  context: string;
  snippet: string;
  durationLabel: string;
};

/** Flip to true when `/public/audio/demo/*.mp3` assets exist. */
export const AUDIO_DEMO_HAS_AUDIO = false;

export const AUDIO_DEMO = {
  eyebrow: "Hear the agent",
  title: "Sample calls by restaurant type",
  lead: "Short recordings for pizza, cafe, diner, and late-night pickup shops are on the way. Until then, open the interactive demo to walk the dashboard and test call flow on your menu.",
  hasAudio: AUDIO_DEMO_HAS_AUDIO,
  demoHref: "/demo",
  comingSoonLabel: "Recording coming soon",
  playLabel: "Play sample call",
  openDemoLabel: "Open interactive demo",
  scenarios: [
    {
      id: "pizza",
      title: "Neighborhood pizza",
      context: "Friday rush · pickup · half-and-half",
      snippet:
        "Caller: Large pepperoni, half no cheese… Agent: Got it—pickup in about twenty minutes?",
      durationLabel: "~2 min sample",
    },
    {
      id: "cafe",
      title: "Corner cafe",
      context: "Morning counter · oat milk · pastry add-on",
      snippet:
        "Caller: Iced latte, oat milk, and that almond croissant if you still have it…",
      durationLabel: "~90 sec sample",
    },
    {
      id: "diner",
      title: "Classic diner",
      context: "All-day breakfast · substitution",
      snippet:
        "Caller: Eggs over easy, swap home fries for fruit… Agent: Still pickup for you?",
      durationLabel: "~2 min sample",
    },
    {
      id: "late-night",
      title: "Late-night pickup",
      context: "After bar rush · sold-out item",
      snippet:
        "Caller: Two burgers—wait, are you out of onion rings? Agent: They are off tonight; fries still on.",
      durationLabel: "~90 sec sample",
    },
  ] satisfies AudioDemoScenario[],
  footnote:
    "Sample audio will be optional and clearly labeled. Live guest calls always use your real menu—not these scripts.",
} as const;
