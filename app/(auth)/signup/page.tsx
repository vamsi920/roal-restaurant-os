import { Suspense } from "react";
import { SignupPageEntry, SignupPageSkeleton } from "@/components/auth/signup-page-entry";
import { buildSignupPageMetadata } from "@/lib/auth/signup-metadata";

export const metadata = buildSignupPageMetadata();

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignupPageSkeleton />}>
      <SignupPageEntry />
    </Suspense>
  );
}
