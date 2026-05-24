"use client";

import { AuthForm } from "./auth-form";
import { LoginValueAside } from "./login-value-aside";

export function LoginPageEntry() {
  return (
    <div className="public-login-entry min-w-0">
      <div className="public-signup-entry__grid">
        <LoginValueAside />
        <div className="public-signup-entry__form min-w-0">
          <AuthForm mode="sign_in" />
        </div>
      </div>
    </div>
  );
}

export function LoginPageSkeleton() {
  return (
    <div className="public-login-entry min-w-0" aria-hidden>
      <div className="public-signup-entry__grid">
        <div className="public-signup-aside public-auth-panel--skeleton min-h-[18rem]" />
        <div className="public-auth-panel public-auth-panel--skeleton min-h-[18rem]" />
      </div>
    </div>
  );
}
