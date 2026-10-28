import { GREETING_TEMPLATES } from "@/components/seo/tools/greeting-data";
import { GreetingTemplates } from "@/components/seo/tools/greeting-templates";
import { ToolPageFrame, toolUrl } from "@/components/seo/tools/tool-page-frame";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

const SLUG = "phone-greeting-templates";
const TITLE = "Restaurant Phone Greeting Templates and Scripts";
const DESCRIPTION =
  "Free restaurant phone greeting templates: open-hours, busy-night, after-hours and holiday closure scripts. Type your restaurant name and copy each one.";

export const metadata = buildPublicPageMetadata({ title: TITLE, description: DESCRIPTION, canonicalPath: `/tools/${SLUG}` });

const FAQS = [
  {
    id: "length",
    question: "How long should a restaurant phone greeting be?",
    answer:
      "Short. Say the restaurant name, thank the caller and ask how you can help. Callers who want to order should get to the order quickly.",
  },
  {
    id: "after-hours",
    question: "What should an after-hours message say?",
    answer:
      "That you are closed, your regular hours, and where to see the menu. If you take catering or large orders, invite callers to leave a name and number.",
  },
  {
    id: "holiday",
    question: "When should I change my greeting for a holiday?",
    answer:
      "A few days before the holiday, so callers hear the closure or special hours ahead of time. Set a reminder to switch it back afterward.",
  },
  {
    id: "host",
    question: "Can a phone host use these greetings?",
    answer:
      "Yes. A good phone host opens the same way: name, thanks, and a clear question. ROAL then takes the order from your live menu and sends the ticket to your kitchen screen.",
  },
];

export default function Page() {
  return (
    <ToolPageFrame
      slug={SLUG}
      title="Phone greeting scripts you can copy today"
      lead="Twelve short scripts for open hours, busy nights, after hours and holidays. Type your restaurant name and copy."
      aeo={{
        question: "What is a good restaurant phone greeting?",
        answer:
          "A good greeting says the restaurant name, thanks the caller and asks one clear question, like whether they want pickup or delivery. Keep it under ten seconds so callers can get to their order.",
      }}
      howTitle="How to use these scripts"
      how={
        <>
          <p>Type your restaurant name above. Every script updates with it.</p>
          <p>Replace the parts in [brackets] with your own hours, dates, times and specials.</p>
          <p>Read it out loud once. If it feels long, cut a sentence. Callers mostly want to order or check hours.</p>
          <p>Record it on your phone system or voicemail, then call your own number to hear how it sounds.</p>
        </>
      }
      faqs={FAQS}
      relatedTools={["call-forwarding-codes", "missed-call-calculator"]}
      relatedPages={["/use-cases/rush-hour", "/blog"]}
      pageJsonLd={{
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Restaurant phone greeting templates",
        description: DESCRIPTION,
        url: toolUrl(`/tools/${SLUG}`),
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any (runs in the browser)",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        hasPart: GREETING_TEMPLATES.map((t) => ({
          "@type": "CreativeWork",
          name: t.title,
          text: t.body.split("{name}").join("[restaurant name]"),
        })),
      }}
    >
      <GreetingTemplates />
    </ToolPageFrame>
  );
}
