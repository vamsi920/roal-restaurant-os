import { notFound } from "next/navigation";
import { LandingTemplate } from "@/components/seo/landing-template";
import { getLandingPage, getLandingPages } from "@/lib/seo/landing";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

const FAMILY = "locations" as const;

export const dynamicParams = false;

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return getLandingPages(FAMILY).map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Props) {
  const page = getLandingPage(FAMILY, params.slug);
  if (!page) return {};
  return buildPublicPageMetadata({ title: page.seoTitle, description: page.description, canonicalPath: `/${FAMILY}/${page.slug}` });
}

export default function Page({ params }: Props) {
  const page = getLandingPage(FAMILY, params.slug);
  if (!page) notFound();
  return <LandingTemplate family={FAMILY} page={page} />;
}
