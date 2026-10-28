import { PhoneStaffCostCalculator } from "@/components/seo/tools/phone-staff-cost-calculator";
import { ToolPageFrame, webApplicationJsonLd } from "@/components/seo/tools/tool-page-frame";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

const SLUG = "phone-staff-cost-calculator";
const TITLE = "Restaurant Phone Staff Cost Calculator (Free)";
const DESCRIPTION =
  "Free restaurant phone staff cost calculator. Enter hourly wage, phone hours and payroll overhead to see weekly, monthly and yearly cost of phone coverage.";

export const metadata = buildPublicPageMetadata({ title: TITLE, description: DESCRIPTION, canonicalPath: `/tools/${SLUG}` });

const FAQS = [
  {
    id: "overhead",
    question: "What is payroll overhead?",
    answer:
      "It is what you pay on top of the hourly wage: payroll taxes, workers' comp, and any benefits. Your bookkeeper or payroll report can give you the real percentage.",
  },
  {
    id: "partial-hours",
    question: "What if nobody only answers the phone?",
    answer:
      "Count the hours someone is tied to the phone, even if they also run the register. If half a shift goes to calls, count half those hours.",
  },
  {
    id: "replace-staff",
    question: "Does ROAL replace my staff?",
    answer:
      "It takes phone orders so your team can focus on guests in front of them and food going out. Catering, complaints and manager requests still go to your people.",
  },
  {
    id: "roal-price",
    question: "How is ROAL priced?",
    answer:
      "$0.90 per completed phone order. No monthly fee, no setup fee, no per-minute fee, and no contract.",
  },
];

export default function Page() {
  return (
    <ToolPageFrame
      slug={SLUG}
      title="What does covering the phone cost you?"
      lead="Work out what phone coverage costs in wages and overhead, then compare it with paying per order."
      aeo={{
        question: "How much does it cost to have staff answer restaurant phones?",
        answer:
          "Multiply the hourly wage by the hours someone covers the phone each week, then add payroll overhead. Multiply by about 4.33 for a month and 52 for a year. Compare that with your phone orders per month × $0.90 with ROAL.",
      }}
      how={
        <>
          <p>Weekly cost = hourly wage × phone hours per week × (1 + payroll overhead %).</p>
          <p>Monthly cost = weekly cost × 4.33 (52 weeks ÷ 12 months). Yearly cost = weekly cost × 52.</p>
          <p>ROAL cost = phone orders per month × $0.90. Yearly = monthly × 12.</p>
          <p>It does not count time lost to calls during the rush, like tickets that wait while someone is on the phone.</p>
        </>
      }
      faqs={FAQS}
      relatedTools={["missed-call-calculator", "phone-host-cost-calculator"]}
      relatedPages={["/compare/answering-service", "/use-cases/rush-hour"]}
      pageJsonLd={webApplicationJsonLd(SLUG, "Restaurant phone staff cost calculator", DESCRIPTION)}
    >
      <PhoneStaffCostCalculator />
    </ToolPageFrame>
  );
}
