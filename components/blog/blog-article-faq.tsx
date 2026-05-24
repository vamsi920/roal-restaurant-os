import type { BlogFaqItem } from "@/lib/blog/types";

type Props = {
  items: BlogFaqItem[];
};

function faqItemId(question: string, index: number): string {
  const slug = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `faq-${slug || index}`;
}

export function BlogArticleFaq({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section
      id="faq"
      className="blog-article-faq"
      aria-labelledby="blog-faq-heading"
      itemScope
      itemType="https://schema.org/FAQPage"
    >
      <h2 id="blog-faq-heading" className="blog-article-faq__title">
        FAQ
      </h2>
      <dl className="blog-article-faq__list">
        {items.map((item, index) => (
          <div
            key={item.question}
            id={faqItemId(item.question, index)}
            className="blog-article-faq__item"
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <dt className="blog-article-faq__q" itemProp="name">
              {item.question}
            </dt>
            <dd
              className="blog-article-faq__a"
              itemScope
              itemProp="acceptedAnswer"
              itemType="https://schema.org/Answer"
            >
              <span itemProp="text">{item.answer}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
