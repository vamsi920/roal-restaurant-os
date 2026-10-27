import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton } from "@/components/auth/auth-form";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { RESET_PASSWORD_PAGE_COPY } from "@/lib/auth/reset-password-copy";

export const metadata: Metadata = {
  title: RESET_PASSWORD_PAGE_COPY.seo.title,
  description: RESET_PASSWORD_PAGE_COPY.seo.description,
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
