import { isAuthDemoMode } from "@/lib/auth/demo-mode";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { RESET_PASSWORD_PAGE_COPY } from "@/lib/auth/reset-password-copy";

export const metadata: Metadata = {
  title: RESET_PASSWORD_PAGE_COPY.seo.title,
  description: RESET_PASSWORD_PAGE_COPY.seo.description,
};

/** `/reset-password` — request a Firebase reset email. Old `?mode=update` links land here too. */
export default function ResetPasswordPage() {
  return <ResetPasswordForm demoMode={isAuthDemoMode()} />;
}
