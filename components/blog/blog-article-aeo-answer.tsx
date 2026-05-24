import type { BlogArticleContent } from "@/lib/blog/types";

type Props = {
  content: BlogArticleContent;
  /** Fallback when no `aeoQuestion` or FAQ */
  fallbackQuestion: string;
};

export function blogArticleAeoQuestion(
  content: BlogArticleContent,
  fallbackQuestion: string
): string {
  return content.aeoQuestion?.trim() || content.faq[0]?.question || fallbackQuestion;
}

function blogArticleAeoDetail(content: BlogArticleContent): string | undefined {
  const summary = content.summary.trim();
  const answer = content.answerShort.trim();
  if (!summary || summary === answer) return undefined;
  return summary;
}

export function BlogArticleAeoAnswer({ content, fallbackQuestion }: Props) {
  const question = blogArticleAeoQuestion(content, fallbackQuestion);
  const detail = blogArticleAeoDetail(content);

  return (
    <aside
      className="blog-article-answer"
      aria-labelledby="blog-article-aeo-heading"
      itemScope
      itemType="https://schema.org/Question"
    >
      <p className="blog-article-answer__label">Short answer</p>
      <h2 id="blog-article-aeo-heading" className="blog-article-answer__question" itemProp="name">
        {question}
      </h2>
      <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
        <p className="blog-article-answer__text" itemProp="text">
          {content.answerShort}
        </p>
        {detail ? <p className="blog-article-answer__detail">{detail}</p> : null}
      </div>
    </aside>
  );
}
