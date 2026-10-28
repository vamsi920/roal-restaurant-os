import type { Metadata } from "next";
import { SupportHub } from "@/components/dashboard/support-hub";

export const metadata: Metadata = { title: "Support — ROAL" };

export default function SupportPage() {
  return <SupportHub />;
}
