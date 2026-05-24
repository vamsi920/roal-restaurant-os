import { BLOG_CTA_DEMO } from "../cta";
import type { BlogArticleContent } from "../types";

export const aiPhoneOrderingSmallRestaurantsContent: BlogArticleContent = {
  summary:
    "Locals still call for pickup. AI can answer forwarded rings, build from your live menu, and ticket the kitchen—so your host stays on the floor during rush.",
  answerShort:
    "AI phone ordering helps small restaurants take more pickup orders by answering forwarded calls in plain language (not a phone tree), building the cart from your live menu, confirming name and phone on the call, and sending a ticket to the KDS—so pickups can hit the pass while the dining room is full.",
  author: "ROAL Team",
  seo: {
    title: "AI Phone Ordering for Small Restaurants — How It Works | ROAL Journal",
    description:
      "AI takes restaurant phone orders: natural pickup calls, live menu modifiers, guest confirmation, and KDS tickets—without pulling staff off the floor.",
  },
  sections: [
    {
      id: "why-guests-still-call",
      title: "Why guests still call your restaurant",
      paragraphs: [
        "Your Thursday regular does not want an app—they want to hear if the special is still on and add extra sauce. Your family-tray caller wants to know if you can have it ready by six-thirty. That is normal pickup behavior at a small restaurant.",
        "The phone is still the highest-trust channel: no delivery-app markup, no driver mystery, direct line to your kitchen. The problem is not lack of demand—it is [missed calls during rush](/blog/why-restaurants-miss-calls-dinner-rush) when the same people who run the floor cannot also cover the line.",
        "AI phone ordering is not about replacing your brand. It is about making sure the call gets answered and the order becomes a ticket your line can cook.",
      ],
    },
    {
      id: "example-neighborhood-thai",
      title: "Example: a neighborhood spot on a Friday night",
      paragraphs: [
        "Picture a 40-seat Thai place at 7:15 p.m. The host is seating a four-top, expo is calling tickets, and the phone rings with \"two pad see ew, one medium spice, extra basil.\"",
        "Without coverage, that call goes to voicemail—or the guest orders from the shop that picked up on ring two. With AI phone ordering, the agent answers, maps \"medium spice\" to your heat levels, asks the required protein choice, and read-backs the bowls before the ticket hits the pass.",
        "Your cook sees the order on the KDS while the guest is still on the line. No sticky note, no manager decoding voicemail after the rush.",
      ],
    },
    {
      id: "natural-call",
      title: "A real conversation—not press 1 for pickup",
      paragraphs: [
        "Old phone trees train people to hang up. Modern AI pickup ordering lets guests talk normally: pause, change their mind, ask \"what comes on the combo?\" the way they would with a good host.",
        "The job is clarity, not small talk. The agent confirms what it heard, slows down on modifiers, and asks one tight question when something is ambiguous—\"crispy or grilled?\" not a twenty-question survey.",
        "If a new number says \"the usual,\" the agent asks a short follow-up instead of guessing. For voice quality and disclosure guests expect, see [what makes a restaurant AI voice agent sound human](/blog/restaurant-ai-voice-agent-sounds-human).",
      ],
    },
    {
      id: "live-menu",
      title: "Live menu lookup—not last season's PDF",
      paragraphs: [
        "A phone agent is only as good as the menu it reads. ROAL uses the same live menu your kitchen runs: current items, sizes, prices, and 86'd dishes—not a static file from last year.",
        "When trout is off tonight, the next caller should hear that before the ticket lands wrong. That is [why your phone agent must know your live menu](/blog/phone-agent-must-know-live-menu)—one source of truth for voice and the pass.",
        "Simple questions get answered on the call: \"Do you have gluten-free pasta?\" \"What sides come with the platter?\"—without hold music.",
      ],
    },
    {
      id: "example-pizza-modifiers",
      title: "Example: half-and-half and \"no onion\"",
      paragraphs: [
        "Phone orders break on details. A pizza shop hears \"half pepperoni, half mushroom, light cheese, no onion.\" AI should map that to your modifier groups—the same taps your staff would make—not free-text guesses.",
        "Required choices come first: size, crust, then toppings. If someone asks for a modification you do not allow, the agent [hands off to staff](/blog/when-ai-should-hand-off-to-staff) instead of inventing a pizza your oven cannot make.",
        "Pickup revenue lives in these small requests. Getting them right the first time is what keeps locals calling instead of tapping a competitor app.",
      ],
    },
    {
      id: "confirm-and-ticket",
      title: "Name, phone, read-back—then the ticket",
      paragraphs: [
        "Before the kitchen fires, the guest confirms who they are and how to reach them—on the line, not guessed from caller ID later.",
        "A short read-back closes the loop: items, modifiers, pickup timing if you quote it. Guests catch mistakes while they still care.",
        "That step also defines a successful order for billing: real guest, finalized ticket on the KDS—not hang-ups, wrong numbers, or test calls. See [paying only for successful orders](/blog/pay-only-successful-orders) and [pricing](/pricing) for how pilots spell that out.",
      ],
    },
    {
      id: "independents-win",
      title: "Why small restaurants win on pickup",
      paragraphs: [
        "Chains win drive-thru consistency. You win flavor, memory, and flexibility. AI removes \"I called twice and nobody answered\" so more loyalty turns into tickets on your screen.",
        "You keep more margin than many [delivery app orders](/blog/phone-orders-vs-delivery-apps), and you keep the relationship—who orders every Thursday, who always wants extra peppers.",
        "Most owners start with peak nights only, then expand when the pass shows steady phone volume. Setup is often about twenty minutes—menu scan, test call, ticket on the pass—see [go live in about 20 minutes](/blog/setup-roal-20-minutes).",
      ],
    },
    {
      id: "what-stays-human",
      title: "What stays with your team",
      paragraphs: [
        "AI does not replace cooks, hospitality, or your call on comps. It does not run the dining room.",
        "Allergies, complaints, catering-sized orders, and policy exceptions should transfer to a person—with the cart already built so the guest does not repeat every item.",
        "Think of it as coverage for the line that already rings: your staff focus on guests in the room; pickup still becomes food on the pass.",
      ],
    },
    {
      id: "try-before-live",
      title: "Try a demo call before you forward live guests",
      paragraphs: [
        "Listen to how the agent handles your menu: modifiers, read-back, and handoff—not a generic script.",
        "When test tickets match what expo expects, forward Friday pickup first. Expand when tickets look boringly correct.",
      ],
    },
  ],
  faq: [
    {
      question: "What is AI phone ordering for restaurants?",
      answer:
        "Software that answers pickup calls, takes orders in natural language from your live menu, confirms the guest on the line, and sends a ticket to your kitchen display—built for independents, not just chains.",
    },
    {
      question: "How does AI phone ordering work step by step?",
      answer:
        "Answer the call → build the cart from live items and modifiers → confirm name and phone → read back → ticket the KDS. Staff step in for allergies, complaints, or off-menu requests.",
    },
    {
      question: "Can AI take phone orders with modifiers and special requests?",
      answer:
        "Yes when modifiers live in your menu model—sizes, required choices, add-ons. Unusual or off-policy requests should transfer to staff rather than guess.",
    },
    {
      question: "Is AI phone ordering worth it for a small restaurant?",
      answer:
        "It helps most when rush-hour phone coverage is thin but pickup callers are loyal—one or two locations, real modifiers, and tickets you want on the pass without a phone-only hire every Friday.",
    },
    {
      question: "Do AI phone orders show up on the kitchen display?",
      answer:
        "With ROAL, confirmed pickups appear on your KDS like other tickets, so the line can start while the guest is still on the call.",
    },
  ],
  relatedSlugs: [
    "phone-agent-must-know-live-menu",
    "pay-only-successful-orders",
    "why-restaurants-miss-calls-dinner-rush",
    "setup-roal-20-minutes",
  ],
  cta: {
    ...BLOG_CTA_DEMO,
    description:
      "Try a demo call with your menu in mind—modifiers and read-back included—when you want to hear how pickup could sound before you change the line.",
  },
};
