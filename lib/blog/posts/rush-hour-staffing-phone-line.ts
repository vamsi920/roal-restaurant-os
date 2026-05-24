import { BLOG_CTA_DEMO } from "../cta";
import type { BlogArticleContent } from "../types";

export const rushHourStaffingPhoneLineContent: BlogArticleContent = {
  summary:
    "At rush the host is not free because the door looks calm. Split phone coverage—human, AI, or hybrid—so pickup still hits the pass while expo runs the room.",
  answerShort:
    "Rush-hour phone staffing fails when the same people seat, expo, and answer rings. Fix it with a dedicated phone block, AI on forwarded calls that tickets your live menu to the KDS, or a hybrid where staff take allergies and complaints—instead of hoping someone grabs the handset between tables.",
  author: "ROAL Team",
  seo: {
    title: "Rush-Hour Staffing for the Restaurant Phone Line | ROAL Journal",
    description:
      "When the host cannot cover every ring: phone-only coverage, hybrid AI + staff, and keeping pickup tickets on the pass during rush.",
  },
  sections: [
    {
      id: "same-person-problem",
      title: "Why \"whoever is nearby\" fails at 7 p.m.",
      paragraphs: [
        "The dining room signals busy, not the phone. Rings stack while your host seats a six-top and expo fires apps. Voicemail is not a strategy—it is a delayed apology.",
        "Pickup callers rarely wait through four rings twice in one week. They order somewhere that answered.",
      ],
    },
    {
      id: "dedicated-coverage",
      title: "Dedicated phone coverage (human or hybrid)",
      paragraphs: [
        "Some shops add a phone block: 5:30–8:30 p.m., one person, pickup and questions only. That works when labor is available and you can train modifiers cold.",
        "When labor is not available, AI coverage can take forwarded rings with the live menu and send tickets to the pass—staff jump in for allergies, complaints, or odd requests.",
      ],
    },
    {
      id: "hybrid-shift",
      title: "A practical hybrid for independents",
      paragraphs: [
        "Let AI handle order-taking and cart building; keep one manager or senior host for transfers and overrides. The pass still shows the same tickets; guests still get a person when it matters.",
        "Post the escalation name where expo can see it—no guessing who picks up \"line two, guest upset.\"",
      ],
    },
    {
      id: "measure-coverage",
      title: "Measure coverage, not guilt",
      paragraphs: [
        "Track answered vs missed rings for two weekends before you change anything. After coverage, track completed pickup tickets from the phone channel on your KDS.",
        "If tickets rise without adding dining-room chaos, your staffing model matched how guests actually order.",
      ],
    },
  ],
  faq: [
    {
      question: "Should a host answer phones during dinner rush?",
      answer:
        "Only if phone is their primary job during that block. Otherwise rings compete with seating and expo, and pickup orders leak.",
    },
    {
      question: "Can AI replace a phone-only employee?",
      answer:
        "AI can cover order-taking and tickets; keep humans for judgment calls, allergies, and service recovery.",
    },
    {
      question: "How do I know if rush-hour phone coverage is working?",
      answer:
        "Fewer missed rings and more completed pickup tickets on the kitchen display during the same busy windows you measured before.",
    },
    {
      question: "Is AI phone coverage cheaper than a phone-only shift?",
      answer:
        "Compare one rush-hour wage plus missed calls to success-based fees on completed tickets. Many independents test AI on busy nights first, then decide on labor.",
    },
    {
      question: "Can I use ROAL only on Friday and Saturday nights?",
      answer:
        "Yes—forward the line when you want coverage. Lots of pilots start with peak nights only, then expand when tickets on the pass look consistent.",
    },
  ],
  relatedSlugs: [
    "why-restaurants-miss-calls-dinner-rush",
    "ai-phone-ordering-small-restaurants",
    "cost-unanswered-restaurant-phone-calls",
  ],
  cta: {
    ...BLOG_CTA_DEMO,
    description:
      "Start with a demo call on your menu, then try forwarding one peak night when you want to see tickets land without pulling a host off the floor.",
  },
};
