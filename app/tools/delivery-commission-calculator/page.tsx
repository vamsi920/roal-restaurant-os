import { DeliveryCommissionCalculator } from "@/components/seo/tools/delivery-commission-calculator";
import { ToolPageFrame, webApplicationJsonLd } from "@/components/seo/tools/tool-page-frame";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

const SLUG = "delivery-commission-calculator";
const TITLE = "Delivery App Commission Calculator for Restaurants";
const DESCRIPTION =
  "Free delivery app commission calculator for restaurants. See what you pay in commission each month and year versus the same orders taken by phone.";

export const metadata = buildPublicPageMetadata({ title: TITLE, description: DESCRIPTION, canonicalPath: `/tools/${SLUG}` });

const FAQS = [
  {
    id: "typical-commission",
    question: "How much do delivery apps charge restaurants?",
    answer:
      "Commissions are commonly about 15–30% of each order, depending on the plan and whether the app handles delivery. Your monthly statement shows your real rate.",
  },
  {
    id: "other-fees",
    question: "Does this include every fee?",
    answer:
      "No. It uses one commission rate. Add card processing, marketing or promotion fees to the rate if you want a fuller picture.",
  },
  {
    id: "move-orders",
    question: "Should I stop using delivery apps?",
    answer:
      "Not necessarily. Many owners keep the apps for new customers and ask regulars to call the restaurant directly. Even moving some repeat orders to the phone can add up.",
  },
  {
    id: "phone-cost",
    question: "What does a phone order cost with ROAL?",
    answer:
      "$0.90 per completed order. There is no monthly fee, setup fee or per-minute fee. If you deliver yourself, driver costs are separate.",
  },
];

export default function Page() {
  return (
    <ToolPageFrame
      slug={SLUG}
      title="What are delivery app commissions really costing you?"
      lead="Compare a month of delivery app commission with the same orders taken over your own phone."
      aeo={{
        question: "How do I calculate delivery app commission for my restaurant?",
        answer:
          "Multiply your monthly delivery app orders by your average order value, then by your commission rate. Commissions are commonly about 15–30%. Compare that with the same orders by phone at $0.90 each with ROAL.",
      }}
      how={
        <>
          <p>Monthly app sales = orders per month × average order value.</p>
          <p>Commission per month = monthly app sales × commission %. Per year = monthly × 12.</p>
          <p>Same orders by phone with ROAL = orders per month × $0.90.</p>
          <p>Difference = commission per month − phone cost per month.</p>
          <p>This leaves out delivery drivers, card fees and packaging, which you would weigh on your own.</p>
        </>
      }
      faqs={FAQS}
      relatedTools={["missed-call-calculator", "phone-host-cost-calculator"]}
      relatedPages={["/compare/delivery-apps", "/pricing"]}
      pageJsonLd={webApplicationJsonLd(SLUG, "Delivery app commission calculator", DESCRIPTION)}
    >
      <DeliveryCommissionCalculator />
    </ToolPageFrame>
  );
}
