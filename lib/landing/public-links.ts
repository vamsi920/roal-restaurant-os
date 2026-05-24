/** Canonical public routes + homepage hash anchors (nav/footer/CTA QA). */

export const PUBLIC_HOME_HASH_IDS = ["how", "trust", "proof"] as const;

/** In-page anchors on marketing routes (not homepage scroll targets). */
export const PUBLIC_PAGE_LOCAL_HASH_IDS = [
  "contact-form",
  "security-technical-heading",
] as const;

export type PublicHomeHashId = (typeof PUBLIC_HOME_HASH_IDS)[number];

export function publicHomeHash(id: PublicHomeHashId): `/#${PublicHomeHashId}` {
  return `/#${id}`;
}

/** App routes with a `page.tsx` under `app/` (marketing + legal). */
export const PUBLIC_MARKETING_ROUTES = [
  "/",
  "/pricing",
  "/blog",
  "/about",
  "/demo",
  "/login",
  "/signup",
  "/contact",
  "/security",
  "/privacy",
  "/terms",
] as const;

export type PublicMarketingRoute = (typeof PUBLIC_MARKETING_ROUTES)[number];

export type ParsedPublicHref = {
  path: string;
  hash: string;
  search: string;
};

export function parsePublicHref(href: string): ParsedPublicHref {
  const hashIdx = href.indexOf("#");
  const beforeHash = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  const hash = hashIdx >= 0 ? href.slice(hashIdx + 1) : "";

  const qIdx = beforeHash.indexOf("?");
  const path = (qIdx >= 0 ? beforeHash.slice(0, qIdx) : beforeHash) || "/";
  const search = qIdx >= 0 ? beforeHash.slice(qIdx + 1) : "";

  return { path, hash, search };
}

export function isPublicMarketingRoute(path: string): boolean {
  return (PUBLIC_MARKETING_ROUTES as readonly string[]).includes(path);
}

export function isKnownPublicHomeHash(hash: string): boolean {
  return (PUBLIC_HOME_HASH_IDS as readonly string[]).includes(hash);
}

export type ValidatePublicHrefOptions = {
  blogSlugs: readonly string[];
};

export function validatePublicHref(
  href: string,
  options: ValidatePublicHrefOptions
): { ok: true } | { ok: false; reason: string } {
  if (href.startsWith("mailto:")) {
    return { ok: true };
  }
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return { ok: true };
  }

  const { path, hash } = parsePublicHref(href);

  if (path === "/" && !hash) {
    return { ok: true };
  }

  if (
    hash &&
    (PUBLIC_PAGE_LOCAL_HASH_IDS as readonly string[]).includes(hash)
  ) {
    return { ok: true };
  }

  if (hash && path !== "/" && path !== "") {
    return { ok: false, reason: `homepage hash only on / (got ${href})` };
  }

  if (hash && !isKnownPublicHomeHash(hash)) {
    return { ok: false, reason: `unknown homepage hash #${hash}` };
  }

  if (path.startsWith("/blog/")) {
    const slug = path.slice("/blog/".length);
    if (!slug || slug.includes("/")) {
      return { ok: false, reason: `invalid blog path ${path}` };
    }
    if (!options.blogSlugs.includes(slug)) {
      return { ok: false, reason: `unknown blog slug ${slug}` };
    }
    return { ok: true };
  }

  if (!isPublicMarketingRoute(path)) {
    return { ok: false, reason: `unknown marketing route ${path}` };
  }

  return { ok: true };
}
