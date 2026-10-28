import { GLOSSARY_JSON, LANDING_JSON } from "./generated-pages";
import type { GlossaryEntryJson, LandingPageJson } from "./landing-types";
import { COMPARE_PAGES, FOR_TYPES, LOCATIONS, USE_CASES, type SeoPageRef } from "./site-pages";

export type LandingFamily = "for" | "use-cases" | "compare" | "locations";

export const LANDING_FAMILIES: Record<
  LandingFamily,
  { refs: SeoPageRef[]; hubTitle: string; hubLead: string; crumb: string; eyebrow: string }
> = {
  for: {
    refs: FOR_TYPES,
    crumb: "Restaurant types",
    eyebrow: "By restaurant type",
    hubTitle: "An AI phone host for every kind of restaurant",
    hubLead: "Pizza shops, Chinese takeout, delis, Indian, halal, bakeries and more. See how a phone host handles the calls your kitchen actually gets.",
  },
  "use-cases": {
    refs: USE_CASES,
    crumb: "Use cases",
    eyebrow: "Use cases",
    hubTitle: "What a phone host handles for your restaurant",
    hubLead: "Rush hour, after hours, catering, reservations, menu questions and callers in other languages.",
  },
  compare: {
    refs: COMPARE_PAGES,
    crumb: "Comparisons",
    eyebrow: "Compare",
    hubTitle: "AI phone host vs the other ways to cover the phone",
    hubLead: "Honest side-by-sides with answering services, voicemail, extra staff, delivery apps, online ordering and phone menus.",
  },
  locations: {
    refs: LOCATIONS,
    crumb: "Locations",
    eyebrow: "Locations",
    hubTitle: "ROAL near you",
    hubLead: "Built in Jersey City, starting with restaurants in Jersey City and Hoboken. ROAL works for any restaurant in the US.",
  },
};

export function getLandingPages(family: LandingFamily): LandingPageJson[] {
  const order = LANDING_FAMILIES[family].refs.map((r) => r.slug);
  return [...(LANDING_JSON[family] ?? [])].sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
}

export function getLandingPage(family: LandingFamily, slug: string): LandingPageJson | undefined {
  return LANDING_JSON[family]?.find((p) => p.slug === slug);
}

export function getGlossary(): GlossaryEntryJson[] {
  return [...GLOSSARY_JSON].sort((a, b) => a.term.localeCompare(b.term));
}

export function getGlossaryEntry(slug: string): GlossaryEntryJson | undefined {
  return GLOSSARY_JSON.find((g) => g.slug === slug);
}
