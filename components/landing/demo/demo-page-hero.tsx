import { DemoPageHeroCta } from "@/components/landing/demo/demo-page-hero-cta";
import { DEMO_PAGE_COPY } from "@/lib/landing/demo-page-copy";

export function DemoPageHero() {
  const { eyebrow, title, description } = DEMO_PAGE_COPY.hero;

  return (
    <header className="public-demo-hero" aria-labelledby="demo-hero-heading">
      <div className="public-demo-hero__wash" aria-hidden />
      <div className="landing-wrap landing-wrap-tight public-demo-hero__inner">
        <p className="public-demo-hero__eyebrow">{eyebrow}</p>
        <h1 id="demo-hero-heading" className="public-demo-hero__title">
          {title}
        </h1>
        <p className="public-demo-hero__deck">{description}</p>
        <DemoPageHeroCta />
      </div>
    </header>
  );
}
