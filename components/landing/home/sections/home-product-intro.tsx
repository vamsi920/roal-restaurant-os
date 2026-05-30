import { HOME_PRODUCT_INTRO } from "@/lib/landing/home-product-intro-copy";

export function HomeProductIntro() {
  const { title, lead, before, after } = HOME_PRODUCT_INTRO;

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
        <div className="home-problem-grid public-reveal-stagger" aria-label="Before and after ROAL">
          {[before, after].map((card) => (
            <article key={card.label} className="home-problem-card public-reveal-item">
              <p className="home-problem-card__label">{card.label}</p>
              <h3 className="home-problem-card__title">{card.title}</h3>
              <ul className="home-problem-card__list">
                {card.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
