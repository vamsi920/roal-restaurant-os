import { SIGNUP_ONBOARDING_NEXT } from "@/lib/auth/signup-page-copy";

export function defaultAuthNextPath(mode: "sign_in" | "sign_up"): string {
  return mode === "sign_up" ? SIGNUP_ONBOARDING_NEXT : "/dashboard";
}

/** Append `?next=` only when destination differs from the mode default. */
export function authHrefWithNext(
  path: "/login" | "/signup",
  next: string,
  mode: "sign_in" | "sign_up"
): string {
  const fallback = defaultAuthNextPath(mode);
  return next === fallback ? path : `${path}?next=${encodeURIComponent(next)}`;
}

/** Preserve deep links; use target default when `next` is still the source default. */
export function authCrossLinkNext(
  next: string,
  from: "sign_in" | "sign_up"
): string {
  const fromDefault = defaultAuthNextPath(from);
  const to = from === "sign_in" ? "sign_up" : "sign_in";
  return next === fromDefault ? defaultAuthNextPath(to) : next;
}
