import { HomeProductProofVisual } from "@/components/landing/home/product-proof/home-product-proof-visual";
import { HOME_PRODUCT_PROOF } from "@/lib/landing/home-product-proof-copy";
import { getHomeProductProofData } from "@/lib/landing/home-product-proof-data";

export function HomeProductProof() {
  const data = getHomeProductProofData();
  const { eyebrow, title, lead } = HOME_PRODUCT_PROOF;

  return (
    <section
      className="home-section home-section--tight home-product-proof"
      aria-labelledby="proof-heading"
    >
      <div className="home-wrap">
        <p className="home-eyebrow">{eyebrow}</p>
        <h2 id="proof-heading" className="home-h2 mt-2">
          {title}
        </h2>
        <p className="home-lead mt-3 max-w-xl">{lead}</p>
        <HomeProductProofVisual data={data} />
      </div>
    </section>
  );
}
