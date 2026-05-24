# Blog SEO Metadata Audit (Prompt 45)

**Status:** Implemented and validated at build time.

---

## Summary

| Check | Status |
|-------|--------|
| Per-post `seo.title` / `seo.description` | **10/10** posts |
| Canonical `/blog/[slug]` | **Yes** — `alternates.canonical` + `metadataBase` |
| Open Graph `article` | **Yes** — `publishedTime`, `modifiedTime`, `section`, `tags`, `authors` |
| Twitter cards | **Yes** — `summary` + title/description |
| `publishedAt` dates | **Yes** — `YYYY-MM-DD` → `T12:00:00.000Z` (OG + JSON-LD) |
| Slugs | **10** unique kebab-case slugs |
| `generateStaticParams` | **Yes** — `getAllPostSlugs()` from same roster |
| Sitemap | **Yes** — `/blog` + all `/blog/{slug}` URLs |
| `robots.txt` | **Allow** `/`, **disallow** `/dashboard/`, `/api/`; sitemap linked |
| JSON-LD | **BlogPosting** + **FAQPage** per article |

---

## Routes

| URL | Metadata builder | In sitemap |
|-----|------------------|------------|
| `/blog` | `buildBlogIndexMetadata()` | Yes (priority 0.9) |
| `/blog/[slug]` × 10 | `buildBlogArticleMetadata(post)` | Yes (priority 0.8 each) |

**Slugs (canonical paths):**

1. `/blog/why-restaurants-miss-calls-dinner-rush`
2. `/blog/ai-phone-ordering-small-restaurants`
3. `/blog/cost-unanswered-restaurant-phone-calls`
4. `/blog/restaurant-ai-voice-agent-sounds-human`
5. `/blog/phone-agent-must-know-live-menu`
6. `/blog/pay-only-successful-orders`
7. `/blog/setup-roal-20-minutes`
8. `/blog/rush-hour-staffing-phone-line`
9. `/blog/phone-orders-vs-delivery-apps`
10. `/blog/when-ai-should-hand-off-to-staff`

---

## Implementation

| File | Role |
|------|------|
| `lib/blog/metadata.ts` | Index + article Next.js `Metadata` |
| `lib/blog/dates.ts` | Shared `blogPublishedInstant()` |
| `lib/blog/validate-seo.ts` | Build-time slug/SEO length checks |
| `lib/blog/json-ld.ts` | Schema.org graph (absolute URLs when `NEXT_PUBLIC_APP_URL` set) |
| `app/blog/[slug]/page.tsx` | `generateMetadata` + `generateStaticParams` |
| `app/sitemap.ts` | Marketing paths + `getAllPosts()` blog URLs |
| `app/robots.ts` | Crawl rules + sitemap URL |
| `app/layout.tsx` | Root `metadataBase` from `getMetadataBase()` |

---

## Validation (runs on import of `lib/blog/posts.ts`)

- **AEO** — `validateAllBlogAeo()`
- **Links** — `validateAllBlogLinks()` (related, CTA, inline)
- **SEO** — `validateAllBlogSeo(BLOG_POSTS)`:
  - Slug: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
  - Title length: 20–80 chars
  - Description length: 50–165 chars
  - Valid `publishedAt` date

---

## Production checklist

1. Set **`NEXT_PUBLIC_APP_URL`** to production origin (e.g. `https://getroal.com`) so canonicals, OG URLs, and JSON-LD use absolute HTTPS links.
2. After deploy, spot-check one article in [Rich Results Test](https://search.google.com/test/rich-results) and confirm `/sitemap.xml` lists all blog URLs.

---

## Fixes applied in this pass

- Article OG: `modifiedTime`, `authors`, `keywords`
- Shared date helper for metadata, sitemap `lastModified`, and JSON-LD
- `robots.ts`: single `allow: "/"` (avoids accidental path whitelist)
- Build-time SEO validator; trimmed one over-length title/description
- Removed circular `sitemap-entries` import; sitemap uses `getAllPosts()` + `blogPublishedInstant()`
