import { redirect } from "next/navigation";
import { buildDemoPageMetadata } from "@/lib/landing/demo-metadata";

export const metadata = buildDemoPageMetadata();

/** The demo is your own menu: /try builds a host from your restaurant link. */
export default function DemoPage() {
  redirect("/try");
}
