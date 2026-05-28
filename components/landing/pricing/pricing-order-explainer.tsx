import type { PRICING_ORDER_EXPLAINER } from "@/lib/landing/pricing-core";
import { PRICING_PAGE_COPY } from "@/lib/landing/pricing-page-copy";

type Explainer = typeof PRICING_ORDER_EXPLAINER;

export function PricingOrderExplainer({
  copy = PRICING_PAGE_COPY.whatCounts,
}: {
  copy?: Explainer;
}) {
  return (
    <section
      className="public-pricing-orders glass-card min-w-0 scroll-mt-24"
      aria-labelledby={copy.titleId}
    >
      <h2 id={copy.titleId} className="public-pricing-orders__title">
        {copy.title}
      </h2>

      <div className="public-pricing-orders__grid">
        <div className="public-pricing-orders__block public-pricing-orders__block--pay">
          <p className="public-pricing-orders__line">{copy.payLine}</p>
          <ul className="public-pricing-orders__examples">
            {copy.payExamples.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="public-pricing-orders__block public-pricing-orders__block--no-pay">
          <p className="public-pricing-orders__line">{copy.noPayLine}</p>
          <ul className="public-pricing-orders__examples">
            {copy.noPayExamples.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
