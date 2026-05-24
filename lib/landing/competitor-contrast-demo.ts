/** Competitor contrast copy — illustrative, no named competitors. */

export type ContrastNotItem = {
  id: string;
  label: string;
  body: string;
};

export const COMPETITOR_CONTRAST_DEMO = {
  eyebrow: "What makes this different",
  title: "More than picking up the phone",
  lead: "Plenty of tools answer calls or chat on your website. ROAL is built for independents who need real pickup orders on the line—not a script that drifts from tonight’s menu.",
  notItems: [
    {
      id: "answering-only",
      label: "Not just call answering",
      body: "Taking a message or reading hours does not put a ticket on your pass. Guests still hang up without an order.",
    },
    {
      id: "chatbot",
      label: "Not a website chatbot",
      body: "Text widgets on your site do not hear rush-hour rings, read modifiers aloud, or stream a draft cart while someone is driving to pickup.",
    },
    {
      id: "static-script",
      label: "Not a static script",
      body: "Fixed FAQs break the moment you 86 an item or change a price. Your team should not re-record prompts every time the menu shifts.",
    },
  ] satisfies ContrastNotItem[],
  is: {
    label: "What ROAL is",
    title: "Pickup calls tied to your live kitchen workflow",
    body: "Forwarded calls start from the menu your staff edits. ROAL syncs the cart to your kitchen screen while the guest is still on the line—so expo can see the order before pickup is confirmed.",
    flow: [
      { step: "1", title: "Live menu", detail: "Items, modifiers, sold-out flags" },
      { step: "2", title: "Phone pickup", detail: "Natural voice · builds the cart" },
      { step: "3", title: "Kitchen pass", detail: "Draft ticket during the call" },
    ],
  },
  footnote:
    "No competitor names here on purpose—we would rather show you the workflow than compare slogans.",
} as const;
