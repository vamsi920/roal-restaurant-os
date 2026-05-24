import { LANDING_CTA } from "@/lib/landing/chapters";
import type { BlogArticleCta } from "./types";

/** Primary journal CTA — matches homepage hero. */
export const BLOG_CTA_DEMO: BlogArticleCta = {
  href: LANDING_CTA.primary.href,
  label: LANDING_CTA.primary.label,
  description:
    "Listen to a sample pickup call with your menu in mind—no live line required.",
};

/** Menu-forward CTA — signup / setup path. */
export const BLOG_CTA_MENU: BlogArticleCta = {
  href: "/signup",
  label: "Try ROAL on your menu",
  description:
    "Scan your menu, place a test call, and watch a ticket land on your kitchen screen.",
};

export type BlogCtaPreset = "demo" | "menu";

const PRESETS: Record<BlogCtaPreset, BlogArticleCta> = {
  demo: BLOG_CTA_DEMO,
  menu: BLOG_CTA_MENU,
};

export function blogCta(preset: BlogCtaPreset, overrides?: Partial<BlogArticleCta>): BlogArticleCta {
  return { ...PRESETS[preset], ...overrides };
}
