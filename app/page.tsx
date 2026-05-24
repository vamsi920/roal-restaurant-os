import { HomeFaqJsonLd } from "@/components/landing/home/home-faq-json-ld";
import { LandingPage } from "@/components/landing/landing-page";
import { buildHomePageMetadata } from "@/lib/landing/home-metadata";

export const metadata = buildHomePageMetadata();

export default function Home() {
  return (
    <>
      <HomeFaqJsonLd />
      <LandingPage />
    </>
  );
}
