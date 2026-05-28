import { HOME_PRODUCT_INTRO } from "@/lib/landing/home-product-intro-copy";

export function HomeProductIntro() {
  const { title, lead } = HOME_PRODUCT_INTRO;

  return (
    <section
      id="trust"
      className="home-section home-section--tight home-product-intro scroll-mt-24"
      aria-labelledby="product-heading"
    >
      <div className="home-wrap public-reveal">
        <h2 id="product-heading" className="home-h2">
          {title}
        </h2>
        <p className="home-lead home-product-intro__lead">{lead}</p>
      </div>
    </section>
  );
}
