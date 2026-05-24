import { BLOG_CTA_DEMO } from "../cta";
import type { BlogArticleContent } from "../types";

export const whenAiShouldHandOffToStaffContent: BlogArticleContent = {
  summary:
    "AI should take the routine pickup cart; your team should take judgment. The handoff works when staff inherit context—not a cold \"press zero.\"",
  answerShort:
    "Restaurant AI should hand off to staff for allergies and cross-contact, complaints, catering-scale requests, policy exceptions, and anything off-menu—transferring with a short cart summary so the guest never repeats the order. Routine items, modifiers, and confirmation stay with the agent.",
  author: "ROAL Team",
  seo: {
    title: "When Restaurant AI Should Hand Off to Staff | ROAL Journal",
    description:
      "Allergies, complaints, catering, and edge cases—how to transfer phone orders from AI to your team without losing the cart.",
  },
  sections: [
    {
      id: "always-handoff",
      title: "Always hand off: safety and service recovery",
      paragraphs: [
        "Severe allergies, cross-contact questions, and \"can you guarantee gluten-free prep\" belong to humans who know your kitchen—not probabilistic reassurance.",
        "Angry guests, wrong-order callbacks, and comp decisions need tone and authority. AI should acknowledge, summarize, and bridge—not argue policy.",
      ],
    },
    {
      id: "often-handoff",
      title: "Usually hand off: size and oddity",
      paragraphs: [
        "Catering for twenty, invoice requests, or custom jobs you have never plated should not be invented on the fly.",
        "If the request is outside your published menu and modifier rules, a person should set expectations on price and timing.",
      ],
    },
    {
      id: "warm-transfer",
      title: "Warm transfer checklist",
      paragraphs: [
        "Tell the guest who is joining and why. One-sentence cart summary for staff (\"two bowls, one no dairy, guest asking about peanut oil\"). Stay on the line until the guest acknowledges the handoff when possible.",
        "Staff see the same ticket on the KDS the agent built—fixes are edits, not re-entry from memory.",
      ],
    },
    {
      id: "train-the-shift",
      title: "Train the shift in five minutes",
      paragraphs: [
        "Name who answers escalations during rush. Practice one allergy call and one complaint call in training week.",
        "Remind expo: a transferred call is still a win—the agent did the repetitive build; you protect the relationship.",
      ],
    },
  ],
  faq: [
    {
      question: "When should a restaurant AI transfer to a human?",
      answer:
        "Allergies, cross-contact, complaints, catering-sized orders, policy exceptions, and off-menu requests—any time judgment beats automation.",
    },
    {
      question: "How should AI hand off phone orders to staff?",
      answer:
        "Brief the guest, summarize the cart, route to a named role, and preserve the ticket on the kitchen display so staff do not re-ask every item.",
    },
    {
      question: "Should AI take allergy orders at all?",
      answer:
        "AI can capture the concern and items, but staff should confirm what is safe for your kitchen before the ticket is treated as final.",
    },
    {
      question: "Will guests get frustrated when transferred to a person?",
      answer:
        "Warm transfers with a one-sentence cart summary feel helpful, not punitive—especially when the alternative is hold music or voicemail.",
    },
    {
      question: "What should staff say when they pick up a handoff?",
      answer:
        "Acknowledge the AI summary (\"I see two pastas, one no dairy—let me confirm your pickup time\"), then continue the cart on the KDS instead of re-asking every item.",
    },
  ],
  relatedSlugs: [
    "restaurant-ai-voice-agent-sounds-human",
    "phone-agent-must-know-live-menu",
    "ai-phone-ordering-small-restaurants",
  ],
  cta: BLOG_CTA_DEMO,
};
