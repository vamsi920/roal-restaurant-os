import { MissedCallCalculator } from "@/components/seo/tools/missed-call-calculator";
import { ToolPageFrame, webApplicationJsonLd } from "@/components/seo/tools/tool-page-frame";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

const SLUG = "missed-call-calculator";
const TITLE = "Restaurant Missed Call Cost Calculator (Free)";
const DESCRIPTION =
  "Free restaurant missed call cost calculator. Enter missed calls, order share and average ticket to see lost sales per week, month and year.";

export const metadata = buildPublicPageMetadata({ title: TITLE, description: DESCRIPTION, canonicalPath: `/tools/${SLUG}` });

const FAQS = [
  {
    id: "count-missed",
    question: "How do I count my missed calls?",
    answer:
      "Open your phone's call history or your phone company's online account and count unanswered calls for one normal week. Pick a week without holidays so the number is typical.",
  },
  {
    id: "order-share",
    question: "What share of missed calls are orders?",
    answer:
      "It depends on your restaurant. Some calls are about hours or directions. Call back a handful of missed numbers or ask staff what most callers want, then use that as your estimate.",
  },
  {
    id: "callers-call-back",
    question: "Don't most callers just call back?",
    answer:
      "Some do. Lower the order share in the calculator if you think many callers try again. The point is to see the size of the gap, not an exact number.",
  },
  {
    id: "roal-cost",
    question: "What would ROAL cost on those orders?",
    answer:
      "ROAL charges $0.90 per completed phone order, with no monthly fee, setup fee or per-minute fee. Calls that don't end in an order cost nothing.",
  },
];

export default function Page() {
  return (
    <ToolPageFrame
      slug={SLUG}
      title="How much do missed calls cost your restaurant?"
      lead="Plug in your own numbers to see the sales that ring out each week, month and year."
      aeo={{
        question: "How do I calculate the cost of missed restaurant calls?",
        answer:
          "Multiply missed calls per week by the share that were orders, then by your average order value. That gives weekly lost sales; multiply by about 4.33 for a month and 52 for a year.",
      }}
      how={
        <>
          <p>Missed orders per week = missed calls per week × share of calls that were orders.</p>
          <p>Lost sales per week = missed orders per week × average order value.</p>
          <p>Lost sales per month = weekly lost sales × 4.33 (52 weeks ÷ 12 months). Per year = weekly × 52.</p>
          <p>ROAL cost on those orders = missed orders per month × $0.90.</p>
          <p>These are sales, not profit. Your food and packaging costs still apply to any order you take.</p>
        </>
      }
      faqs={FAQS}
      relatedTools={["phone-host-cost-calculator", "phone-staff-cost-calculator", "call-forwarding-codes"]}
      relatedPages={["/use-cases/rush-hour", "/pricing"]}
      pageJsonLd={webApplicationJsonLd(SLUG, "Restaurant missed call cost calculator", DESCRIPTION)}
    >
      <MissedCallCalculator />
    </ToolPageFrame>
  );
}
