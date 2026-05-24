import { BLOG_INDEX_COPY } from "@/lib/blog/index-copy";

export function BlogIndexHero() {
  const { eyebrow, title, description } = BLOG_INDEX_COPY.hero;

  return (
    <header className="blog-index-hero" aria-labelledby="blog-index-heading">
      <div className="blog-index-hero__wash" aria-hidden />
      <div className="landing-wrap landing-wrap-tight blog-index-hero__inner">
        <p className="blog-index-hero__eyebrow">{eyebrow}</p>
        <h1 id="blog-index-heading" className="blog-index-hero__title">
          {title}
        </h1>
        <p className="blog-index-hero__deck">{description}</p>
      </div>
    </header>
  );
}
