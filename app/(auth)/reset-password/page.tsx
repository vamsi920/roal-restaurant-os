import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { RESET_PASSWORD_PAGE_COPY } from "@/lib/auth/reset-password-copy";

export const metadata: Metadata = {
  title: RESET_PASSWORD_PAGE_COPY.seo.title,
  description: RESET_PASSWORD_PAGE_COPY.seo.description,
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          className="public-auth-panel public-auth-panel--skeleton min-h-[14rem]"
          aria-hidden
        />
      }
    >
      <div className="public-reset-password-entry min-w-0 overflow-x-clip">
        <ResetPasswordForm />
      </div>
    </Suspense>
  );
}
