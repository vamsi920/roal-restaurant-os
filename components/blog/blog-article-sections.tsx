import { renderBlogInline } from "@/lib/blog/render-inline";
import type { BlogArticleSection } from "@/lib/blog/types";

type Props = {
  sections: BlogArticleSection[];
};

export function BlogArticleSections({ sections }: Props) {
  return (
    <div className="blog-article-sections">
      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="blog-article-section"
          aria-labelledby={`${section.id}-heading`}
        >
          <h2 id={`${section.id}-heading`} className="blog-article-section__title">
            {section.title}
          </h2>
          {section.paragraphs.map((paragraph, i) => (
            <p key={i} className="blog-article-section__p">
              {renderBlogInline(paragraph)}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
