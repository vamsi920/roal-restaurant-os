import { LaunchAeoAnswer } from "@/components/landing/launch-aeo-answer";
import { BLOG_INDEX_COPY } from "@/lib/blog/index-copy";

export function BlogIndexAeo() {
  const { titleId, question, answer, detail } = BLOG_INDEX_COPY.aeo;

  return (
    <LaunchAeoAnswer
      className="public-blog-index-aeo"
      titleId={titleId}
      question={question}
      answer={answer}
      detail={detail}
    />
  );
}
