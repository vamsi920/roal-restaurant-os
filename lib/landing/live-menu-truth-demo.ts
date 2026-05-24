/** Illustrative menu-truth pipeline for landing — not live API data. */

export const LIVE_MENU_TRUTH_DEMO = {
  scan: {
    photoLabel: "Printed menu photo",
    status: "Items pulled from your photo",
    rows: [
      { name: "Spicy tuna poke", meta: "Poke · $14.50" },
      { name: "Miso soup", meta: "Sides · $4.50" },
      { name: "Edamame", meta: "Sides · $5.00" },
    ],
    chips: ["Poke & Bowls", "Sides", "Modifier groups"],
  },
  database: {
    label: "Your menu in ROAL",
    items: [
      {
        name: "Spicy tuna poke",
        price: "$14.50",
        available: true,
        modifierGroups: [
          { name: "Protein", rule: "Optional · max 1", options: ["Extra tuna +$0.50"] },
          { name: "Spice", rule: "Required · pick 1", options: ["Mild", "Medium", "Hot"] },
        ],
      },
      {
        name: "Miso soup",
        price: "$4.50",
        available: true,
        modifierGroups: [],
      },
      {
        name: "Edamame",
        price: "$5.00",
        available: false,
        modifierGroups: [],
        unavailableNote: "Marked unavailable for tonight",
      },
    ],
  },
  agent: {
    toolLabel: "Menu checked at the start of each call",
    exchanges: [
      {
        speaker: "guest" as const,
        text: "Can I get the edamame with my poke?",
      },
      {
        speaker: "agent" as const,
        text: "Edamame is unavailable on tonight's menu—I can add miso soup or another side that's in stock.",
        beat: "unavailable" as const,
      },
      {
        speaker: "guest" as const,
        text: "Poke with extra tuna, mild spice.",
      },
      {
        speaker: "agent" as const,
        text: "Got it—spicy tuna poke, extra tuna at fifty cents, mild spice from your spice group. Anything else?",
        beat: "modifiers" as const,
      },
    ],
  },
  pillars: [
    {
      title: "Unavailable items",
      body: "When you mark something sold out, the agent cannot sell it—so you stop paying for orders you cannot make.",
    },
    {
      title: "Modifier rules",
      body: "Required choices and add-on prices come from your menu—not guesswork that upsets guests at pickup.",
    },
    {
      title: "Fresh menu each call",
      body: "When you edit prices or 86 an item, the next forwarded call should reflect that menu—not a script from last week.",
    },
  ],
} as const;
