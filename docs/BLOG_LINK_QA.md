# Blog link QA (launch queue #91)

## Surfaces

| UI | Href source |
|----|-------------|
| Index grid | `BlogPostCard` → `getBlogPostHref(post.slug)` |
| Featured card | `BlogFeaturedCard` → same |
| Related block | `getRelatedPosts()` → `BlogPostCard` |
| Article body | Markdown `[text](/blog/slug)` in post content modules |

## Load-time validation

`lib/blog/posts.ts` calls `validateAllBlogLinks()` which checks:

- Every `relatedSlugs` entry exists in `BLOG_POSTS` (no self-links, no duplicates)
- Inline `/blog/...` paths in article paragraphs
- Article `cta.href` is one of `/demo`, `/signup`, `/pricing`, `/contact`

## Tests

```bash
npm test -- tests/unit/blog-link-qa.test.ts
```

## Adding a post

1. Add content module under `lib/blog/posts/`.
2. Register slug in `lib/blog/posts.ts`.
3. Set `relatedSlugs` to existing slugs only.
4. Run tests — load-time validators throw on dead links.
