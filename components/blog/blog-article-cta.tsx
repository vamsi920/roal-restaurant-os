import { PublicCtaButton } from "@/components/landing/public";
import { BLOG_CTA_DEMO } from "@/lib/blog/cta";
import type { BlogCategorySlug } from "@/lib/blog/categories";
import type { BlogArticleCta as BlogArticleCtaType } from "@/lib/blog/types";
import { PUBLIC_CTA, PUBLIC_CTA_LABELS } from "@/lib/landing/public-cta";

type Props = {
  cta?: BlogArticleCtaType;
  categorySlug?: BlogCategorySlug;
};

function ctaCopy(categorySlug: BlogCategorySlug | undefined, cta: BlogArticleCtaType) {
  const isMenuCta = cta.label === "Try ROAL on your menu";
  if (isMenuCta) {
    return {
      title: "Put your live menu on the phone line",
      secondary: PUBLIC_CTA.hearDemo,
    };
  }
  if (categorySlug === "pricing") {
    return {
      title: "Only pay when pickup hits your pass",
      secondary: PUBLIC_CTA.seePricing,
    };
  }
  return {
    title: "Cover more rush-hour pickup calls",
    secondary: PUBLIC_CTA.bookDemo,
  };
}

export function BlogArticleCta({ cta = BLOG_CTA_DEMO, categorySlug }: Props) {
  const { title, secondary } = ctaCopy(categorySlug, cta);

  return (
    <aside
      className="blog-article-cta blog-article-cta--closing public-blog-article-cta"
      aria-label="Try ROAL"
    >
      <p className="blog-article-cta__eyebrow">Try ROAL</p>
      <h2 className="blog-article-cta__title">{title}</h2>
      {cta.description ? (
        <p className="blog-article-cta__desc">{cta.description}</p>
      ) : null}
      <div className="blog-article-cta__actions">
        <PublicCtaButton
          href={cta.href}
          label={cta.label === "Try ROAL on your menu" ? PUBLIC_CTA_LABELS.signUp : cta.label}
          variant="primary"
          className="blog-article-cta__btn w-full sm:w-auto"
        />
        <PublicCtaButton
          href={secondary.href}
          label={secondary.label}
          variant="ghost"
          showArrow={false}
          className="w-full sm:w-auto"
        />
      </div>
    </aside>
  );
}
