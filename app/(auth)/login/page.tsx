import { Suspense } from "react";
import {
  LoginPageEntry,
  LoginPageSkeleton,
} from "@/components/auth/login-page-entry";
import { buildLoginPageMetadata } from "@/lib/auth/login-metadata";

export const metadata = buildLoginPageMetadata();

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginPageEntry />
    </Suspense>
  );
}
