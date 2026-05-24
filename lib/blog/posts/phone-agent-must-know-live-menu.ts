import { BLOG_CTA_MENU } from "../cta";
import type { BlogArticleContent } from "../types";

export const phoneAgentMustKnowLiveMenuContent: BlogArticleContent = {
  summary:
    "If voice reads a stale menu, expo stops trusting the phone. Live menu data keeps 86s, modifiers, and prices aligned with the ticket—so the kitchen cooks what the guest actually ordered.",
  answerShort:
    "Your phone agent must know your live menu so unavailable items are declined honestly, modifiers map to how you build plates, prices match the ticket, and staff trust phone orders on the KDS—using the same item data as your kitchen display, not a PDF or generic script that hallucinates dishes you do not sell.",
  author: "ROAL Team",
  seo: {
    title: "Live Menu for Restaurant Phone AI — 86s, Modifiers, Prices | ROAL Journal",
    description:
      "Why restaurant phone agents need a live menu: real-time 86'd items, accurate modifiers and prices, and kitchen confidence on KDS tickets—not guessed orders.",
  },
  sections: [
    {
      id: "kitchen-confidence",
      title: "Kitchen confidence: why expo has to trust the ticket",
      paragraphs: [
        "When a phone ticket lands wrong, expo does not just remake food—they stop trusting every ring. \"Ignore that one, they'll call back\" is how pickup volume dies.",
        "Kitchen confidence means the line can start cooking without a manager re-reading the call. Item names, modifiers, and sold-out state on the KDS match what the guest was told.",
        "That only happens when voice, the ticket, and the pass share one menu—not a PDF from spring and a pass that 86'd trout an hour ago.",
      ],
    },
    {
      id: "two-menus",
      title: "Two menus on one night",
      paragraphs: [
        "Many shops run two menus by accident: the truth on the pass after the 86, and the file the phone still reads. Guests hear \"yes, salmon\" while expo knows it is gone.",
        "Trust breaks at pickup—or mid-prep when the ticket does not match reality. [AI phone ordering](/blog/ai-phone-ordering-small-restaurants) only works when lookup replaces guessing.",
        "Live menu means one object: what the agent says, what prints on the KDS, and what the line plates.",
      ],
    },
    {
      id: "unavailable-items",
      title: "Unavailable items (86'd) on the next ring",
      paragraphs: [
        "Eighty-six is an operations signal, not a marketing footnote. When trout is off, the next caller should hear it before the ticket fires—not after food is half made.",
        "Good behavior sounds like: \"We're out of trout tonight—chicken or pasta instead?\" Bad behavior is a confident yes followed by a callback apology.",
        "Your team 86's from the tools they already use; the agent inherits that state. No separate \"phone night\" script typed at 4:55 p.m.",
        "Test it: 86 a top seller, call in, confirm the agent refuses or redirects and the KDS never shows the dead item.",
      ],
    },
    {
      id: "modifiers",
      title: "Modifiers that match how you build plates",
      paragraphs: [
        "Guests speak in kitchen language: no onion, extra crispy, swap the side, add avocado. Your menu model should encode required choices and add-ons the way staff tap them—not free-text improvisation.",
        "Example: a combo requires soup or salad. The agent asks because your menu requires it, not because a generic bot loves questions. A half-and-half pizza maps to topping rules, not \"sure, we can do anything.\"",
        "Requests outside policy—impossible splits, off-menu subs—should [hand off to staff](/blog/when-ai-should-hand-off-to-staff) with the cart already started, not become modifiers your printer cannot represent.",
        "Structured modifiers are how phone orders stop breaking during [rush](/blog/why-restaurants-miss-calls-dinner-rush) when someone would otherwise rush the call.",
      ],
    },
    {
      id: "price-accuracy",
      title: "Price accuracy: what guests hear vs what the pass shows",
      paragraphs: [
        "Quoting the wrong total is a small embarrassment at hello and a large dispute at pickup. Live menu ties spoken prices to the same numbers on your kitchen screen and receipt logic.",
        "Dayparts, lunch vs dinner, and weeknight specials need the active price set—update once, voice and ticket follow. Last month's laminated sheet is how guests lose faith.",
        "Some owners skip totals on the call and confirm at pickup; if you quote a number, it must come from live data, not model memory.",
        "Price accuracy is part of kitchen confidence: expo is not arguing with a ticket that promised $14.99 for an item that rings up $18 on the pass.",
      ],
    },
    {
      id: "allergy-and-limits",
      title: "Allergies: capture on the cart, confirm with a human",
      paragraphs: [
        "Severe allergies and cross-contact are judgment calls for people who know your layout—not probabilistic reassurance.",
        "A responsible agent acknowledges, notes the concern on the cart, and offers a staff member: \"I have your items—let me bring someone who can confirm what's safe tonight.\"",
        "Menu truth still matters before handoff: the agent should not add peanut sauce because it misheard \"extra green beans.\" See [human-sounding voice + disclosure](/blog/restaurant-ai-voice-agent-sounds-human).",
      ],
    },
    {
      id: "no-hallucinations",
      title: "No hallucinated items—only what you sell",
      paragraphs: [
        "Hallucination here means plausible dishes you do not sell—\"lobster bisque\" at a taco shop, a discontinued lunch special, a modifier that does not exist.",
        "Grounding in live menu data constrains the cart: lookup, then offer real alternatives. Charm without catalog discipline is a remake waiting to happen.",
        "Test calls should include off-menu nicknames, last year's special, and a trick modifier—if the agent stays honest, expo will trust the next Friday ticket.",
      ],
    },
    {
      id: "roal-alignment",
      title: "How ROAL keeps voice and the pass aligned",
      paragraphs: [
        "Start from your real menu: scan or import, edit items and modifier groups in one place, feed both the voice agent and KDS.",
        "When you 86 or change a price, the next call sees it. When the guest confirms, the ticket reflects the same cart—not a spreadsheet maintained for phone only.",
        "Most teams go live in about [twenty minutes](/blog/setup-roal-20-minutes) of setup plus test calls on top sellers—not a multi-week IT project.",
      ],
    },
    {
      id: "go-live-checklist",
      title: "Checklist: menu accuracy before you forward guests",
      paragraphs: [
        "Fix your top twenty phone items and every required modifier group.",
        "Test: sold-out behavior, one messy modifier path, one allergy handoff.",
        "Name who answers escalations during rush—and tell expo phone tickets may arrive pre-built.",
        "If it is wrong on the menu screen, it will be wrong on the phone. Kitchen confidence is a menu discipline problem first.",
      ],
    },
  ],
  faq: [
    {
      question: "Why does a restaurant phone agent need a live menu?",
      answer:
        "So 86'd items, modifiers, prices, and item names match what the kitchen can make. Without it, agents guess—and expo stops trusting phone tickets.",
    },
    {
      question: "How should AI handle 86'd or sold-out items on phone orders?",
      answer:
        "On the next call, the agent should know the item is unavailable, offer real alternatives, and avoid confirming dishes the line cannot produce.",
    },
    {
      question: "Can AI apply menu modifiers correctly on phone orders?",
      answer:
        "Yes when modifiers are structured in your live menu—required choices, add-ons, limits. Off-policy requests should hand off to staff rather than invent modifiers.",
    },
    {
      question: "Should the phone agent quote prices to guests?",
      answer:
        "Only from live menu data tied to your ticket. If you skip totals on the call, confirm at pickup—but never quote from memory or an old file.",
    },
    {
      question: "How does ROAL connect live menu to the kitchen display?",
      answer:
        "Menu scan/import feeds the voice agent and KDS from the same source. Confirmed phone orders become tickets your line can cook without a parallel phone-only menu.",
    },
  ],
  relatedSlugs: [
    "ai-phone-ordering-small-restaurants",
    "restaurant-ai-voice-agent-sounds-human",
    "setup-roal-20-minutes",
    "when-ai-should-hand-off-to-staff",
  ],
  cta: {
    ...BLOG_CTA_MENU,
    description:
      "Scan your menu, fix top sellers and modifier groups, and run test calls for 86s and prices—before rush-hour guests hit the line.",
  },
};
