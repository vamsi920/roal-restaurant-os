import type { Metadata } from "next";

/** Marketing, blog, and legal pages — indexable. */
export const PUBLIC_PAGE_ROBOTS: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

/** Login/signup — crawl links, avoid SERP clutter. */
export const AUTH_PAGE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
  },
};

/** Dashboard and other authenticated app surfaces. */
export const PRIVATE_PAGE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};
