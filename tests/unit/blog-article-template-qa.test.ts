import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("blog article template", () => {
  it("uses a simple stack without TOC or motifs", () => {
    const layout = readFileSync(
      join(REPO, "components/blog/blog-article-layout.tsx"),
      "utf8"
    );
    expect(layout).toContain("BlogArticleHeader");
    expect(layout).toContain("BlogArticleAeoAnswer");
    expect(layout).toContain("BlogArticleSections");
    expect(layout).toContain("BlogArticleFaq");
    expect(layout).toContain("BlogArticleCta");
    expect(layout).not.toContain("BlogArticleToc");
    expect(layout).not.toContain("BlogMotifLayer");
    expect(layout).toContain("blog-article__stack");
  });

  it("renders a dedicated short-answer box", () => {
    const answer = readFileSync(
      join(REPO, "components/blog/blog-article-aeo-answer.tsx"),
      "utf8"
    );
    expect(answer).toContain("blog-article-answer");
    expect(answer).toContain("Short answer");
    expect(answer).not.toContain("LaunchAeoAnswer");
  });

  it("keeps FAQ lean without boilerplate lead", () => {
    const faq = readFileSync(join(REPO, "components/blog/blog-article-faq.tsx"), "utf8");
    expect(faq).not.toContain("blog-article-faq__lead");
    expect(faq).not.toContain("glass-card");
  });
});
