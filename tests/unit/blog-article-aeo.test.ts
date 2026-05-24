import { describe, expect, it } from "vitest";
import { blogArticleAeoQuestion } from "@/components/blog/blog-article-aeo-answer";
import type { BlogArticleContent } from "@/lib/blog/types";

const base: BlogArticleContent = {
  summary: "Summary line.",
  answerShort: "Short answer text.",
  author: "ROAL Team",
  seo: { title: "T", description: "D" },
  sections: [{ id: "s", title: "S", paragraphs: ["p"] }],
  faq: [{ question: "FAQ question?", answer: "FAQ answer." }],
  relatedSlugs: [],
  cta: { href: "/demo", label: "Demo" },
};

describe("blogArticleAeoQuestion", () => {
  it("prefers explicit aeoQuestion", () => {
    expect(
      blogArticleAeoQuestion({ ...base, aeoQuestion: "Custom?" }, "Fallback")
    ).toBe("Custom?");
  });

  it("falls back to first FAQ question", () => {
    expect(blogArticleAeoQuestion(base, "Fallback")).toBe("FAQ question?");
  });
});
