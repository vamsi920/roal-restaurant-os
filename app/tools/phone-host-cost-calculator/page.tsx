import { PhoneHostCostCalculator } from "@/components/seo/tools/phone-host-cost-calculator";
import { ToolPageFrame, webApplicationJsonLd } from "@/components/seo/tools/tool-page-frame";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

const SLUG = "phone-host-cost-calculator";
const TITLE = "AI Phone Host Cost Calculator for Restaurants";
const DESCRIPTION =
  "Free AI phone host cost calculator for restaurants. Compare paying $0.90 per phone order with a fixed monthly plan and find your break-even order count.";

export const metadata = buildPublicPageMetadata({ title: TITLE, description: DESCRIPTION, canonicalPath: `/tools/${SLUG}` });

const FAQS = [
  {
    id: "what-counts",
    question: "What counts as a completed order?",
    answer:
      "An order is complete when the caller confirms name, phone number and items, and the ticket lands on your kitchen screen. Questions, hang-ups and wrong numbers are free.",
  },
  {
    id: "break-even",
    question: "What is the break-even point?",
    answer:
      "It is the number of orders where both options cost the same: the monthly plan price ÷ $0.90. Below that number, paying per order costs less.",
  },
  {
    id: "slow-months",
    question: "What happens in a slow month?",
    answer:
      "With ROAL you pay only for orders that come in, so a slow month costs less. A fixed plan costs the same whether the phone rings or not.",
  },
  {
    id: "extra-fees",
    question: "Are there setup or minute fees?",
    answer:
      "Not with ROAL. There is no monthly fee, setup fee, per-minute fee or contract. When comparing a fixed plan, add any setup or overage fees from that quote.",
  },
];

export default function Page() {
  return (
    <ToolPageFrame
      slug={SLUG}
      title="Pay per order or pay every month?"
      lead="See what an AI phone host costs at your order volume, and where a fixed monthly plan would break even."
      aeo={{
        question: "How much does an AI phone host cost for a restaurant?",
        answer:
          "With ROAL it is your completed phone orders per month × $0.90, with no monthly, setup or per-minute fee. To compare a fixed monthly plan, divide its price by $0.90 to get the break-even order count.",
      }}
      how={
        <>
          <p>ROAL per month = completed phone orders per month × $0.90.</p>
          <p>Break-even orders = fixed monthly plan price ÷ $0.90, rounded down.</p>
          <p>Below the break-even count, paying per order costs less. Above it, the fixed plan costs less on price alone.</p>
          <p>Add any setup, per-minute or overage fees from the other quote to its monthly price for a fair comparison.</p>
        </>
      }
      faqs={FAQS}
      relatedTools={["missed-call-calculator", "phone-staff-cost-calculator", "delivery-commission-calculator"]}
      relatedPages={["/pricing", "/compare/answering-service"]}
      pageJsonLd={webApplicationJsonLd(SLUG, "AI phone host cost calculator", DESCRIPTION)}
    >
      <PhoneHostCostCalculator />
    </ToolPageFrame>
  );
}
