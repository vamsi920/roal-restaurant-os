import { HowFlowCallVisual } from "@/components/landing/home/how-flow/how-flow-call-visual";
import { HowFlowTicketVisual } from "@/components/landing/home/how-flow/how-flow-ticket-visual";
import type { getHomeProductProofData } from "@/lib/landing/home-product-proof-data";
import { HOME_PRODUCT_PROOF } from "@/lib/landing/home-product-proof-copy";

type ProofData = ReturnType<typeof getHomeProductProofData>;

type Props = {
  data: ProofData;
};

function ProofBridge() {
  return (
    <div className="home-product-proof__bridge" aria-hidden>
      <span className="home-product-proof__bridge-label">{HOME_PRODUCT_PROOF.bridge}</span>
      <svg className="home-product-proof__bridge-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 12h12m0 0-4-4m4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function HomeProductProofVisual({ data }: Props) {
  const { callLabel, ticketLabel } = HOME_PRODUCT_PROOF;

  return (
    <figure className="home-product-proof__figure">
      <div className="home-product-proof__flow">
        <div className="home-product-proof__pane home-glass-panel">
          <p className="home-how-visual__label">{callLabel}</p>
          <HowFlowCallVisual lines={data.conversation} />
        </div>
        <ProofBridge />
        <div className="home-product-proof__pane home-glass-panel">
          <p className="home-how-visual__label">{ticketLabel}</p>
          <HowFlowTicketVisual model={data.ticket} />
        </div>
      </div>
      <figcaption className="home-product-proof__caption">
        <span>{HOME_PRODUCT_PROOF.foot}</span>
        <span className="home-product-proof__meta">{data.scenario}</span>
      </figcaption>
    </figure>
  );
}
