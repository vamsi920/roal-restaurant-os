"use client";

import { LOGIN_PAGE_COPY } from "@/lib/auth/login-page-copy";
import { AuthForm } from "./auth-form";

export function LoginPageEntry() {
  const { entry, highlights } = LOGIN_PAGE_COPY;
  return (
    <>
      <aside className="auth-aside">
        <p className="eyebrow">{entry.eyebrow}</p>
        <h2 className="h2 mt-3">{entry.title}</h2>
        <p className="lead mt-3">{entry.description}</p>
        <ul className="auth-aside__list">
          {highlights.map((item, i) => (
            <li key={item.title}>
              <span className="auth-aside__num" aria-hidden>
                {i + 1}
              </span>
              <div className="min-w-0">
                <strong>{item.title}</strong>
                <span>{item.tag}</span>
              </div>
            </li>
          ))}
        </ul>
      </aside>
      <div className="w-full min-w-0">
        <AuthForm mode="sign_in" />
      </div>
    </>
  );
}

export function LoginPageSkeleton() {
  return (
    <>
      <div className="auth-aside auth-panel auth-panel--skeleton min-h-[16rem]" aria-hidden />
      <div className="auth-panel auth-panel--skeleton min-h-[18rem] w-full" aria-hidden />
    </>
  );
}
