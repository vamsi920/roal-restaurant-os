import Link from "next/link";
import type { ReactNode } from "react";

const INLINE_LINK_RE = /\[([^\]]+)\]\((\/[^)]+)\)/g;

/** Renders blog copy with `[label](/path)` internal links. */
export function renderBlogInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let linkIndex = 0;

  for (const match of text.matchAll(INLINE_LINK_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    parts.push(
      <Link key={`${index}-${linkIndex++}`} href={match[2]} className="public-blog-link">
        {match[1]}
      </Link>
    );
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return text;
  if (parts.length === 1) return parts[0];
  return <>{parts}</>;
}
