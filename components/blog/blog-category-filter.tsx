"use client";

import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import type { BlogFilterValue } from "@/lib/blog/filter";
import { cn } from "@/lib/cn";

export type { BlogFilterValue } from "@/lib/blog/filter";

type Props = {
  value: BlogFilterValue;
  onChange: (value: BlogFilterValue) => void;
  /** ID of the element listing filtered posts (for aria-controls). */
  resultsId: string;
};

export function BlogCategoryFilter({ value, onChange, resultsId }: Props) {
  return (
    <div
      className="blog-category-filter"
      role="group"
      aria-label="Filter articles by category"
    >
      <button
        type="button"
        className={cn("blog-category-filter__chip", value === "all" && "is-active")}
        aria-pressed={value === "all"}
        aria-controls={resultsId}
        onClick={() => onChange("all")}
      >
        All
      </button>
      {BLOG_CATEGORIES.map((cat) => (
        <button
          key={cat.slug}
          type="button"
          className={cn(
            "blog-category-filter__chip",
            value === cat.slug && "is-active"
          )}
          aria-pressed={value === cat.slug}
          aria-controls={resultsId}
          onClick={() => onChange(cat.slug)}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
