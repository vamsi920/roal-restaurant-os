import { ImageResponse } from "next/og";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { getCategoryLabel } from "@/lib/blog/categories";

export const alt = "ROAL Journal article";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Per-article share card: category, headline, byline. */
export default async function BlogOgImage({ params }: { params: { slug: string } }) {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);
  const title = post?.title ?? "The ROAL Journal";
  const category = post ? getCategoryLabel(post.primaryCategorySlug) : "Guides";
  const line = "rgba(17,17,17,0.05)";
  const grid = `linear-gradient(to bottom, ${line} 1px, transparent 1px), linear-gradient(to right, ${line} 1px, transparent 1px)`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#F7F6F3",
          backgroundImage: grid,
          backgroundSize: "36px 36px",
          color: "#111111",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#111111", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: "#EA580C" }} />
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>ROAL Journal</div>
          </div>
          <div style={{ display: "flex", padding: "10px 20px", borderRadius: 999, background: "#111111", color: "#F7F6F3", fontSize: 22, fontWeight: 700 }}>
            {category}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: title.length > 52 ? 64 : 76, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.05, maxWidth: 1050 }}>
          {title}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#5F5C55" }}>
          <span>By Venkata Vamsi · Jersey City, NJ</span>
          <span>tryroal.com</span>
        </div>
      </div>
    ),
    size
  );
}
