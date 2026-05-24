import { BLOG_CATEGORIES } from "./categories";
import type { BlogFilterValue } from "./filter";

export function getBlogFilterLabel(value: BlogFilterValue): string {
  if (value === "all") return "All categories";
  return BLOG_CATEGORIES.find((c) => c.slug === value)?.label ?? value;
}
