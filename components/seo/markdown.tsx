import Link from "next/link";
import type { ReactNode } from "react";
import { isPublishedSlug } from "@/lib/blog";

// Minimal markdown renderer for generated content: paragraphs, ### headings, - and 1. lists,
// | tables |, **bold**, *italic* and [links](/path). Renders React nodes, never raw HTML.
// Links to blog posts that are not published yet render as plain text until their day.

function linkable(href: string): boolean {
  if (!href.startsWith("/blog/")) return true;
  return isPublishedSlug(href.slice("/blog/".length).split(/[#?]/)[0]);
}

export function mdInline(text: string, key = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1]) out.push(<strong key={k}>{m[1]}</strong>);
    else if (m[2]) out.push(<em key={k}>{m[2]}</em>);
    else if (m[4].startsWith("/") && linkable(m[4])) {
      out.push(
        <Link key={k} href={m[4]} className="public-blog-link">
          {m[3]}
        </Link>
      );
    } else out.push(m[3]);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export { mdPlain } from "@/lib/seo/md-plain";

const cells = (row: string) =>
  row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

const BLOCK_START = /^#{3,4}\s|^\s*[-*]\s|^\s*\d+[.)]\s|^\s*\|/;

export function Markdown({ text, className = "seo-md" }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let b = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `b${b++}`;
    if (!line.trim()) {
      i++;
      continue;
    }
    if (/^#{3,4}\s/.test(line)) {
      blocks.push(<h3 key={key}>{mdInline(line.replace(/^#+\s/, ""), key)}</h3>);
      i++;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(lines[i++]);
      const body = rows.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r));
      const [head, ...rest] = body.map(cells);
      blocks.push(
        <div key={key} className="seo-md__table">
          <table>
            <thead>
              <tr>{head?.map((c, j) => <th key={j}>{mdInline(c, `${key}h${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rest.map((r, ri) => (
                <tr key={ri}>{r.map((c, j) => <td key={j}>{mdInline(c, `${key}r${ri}${j}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^\s*[-*]\s/.test(line) || /^\s*\d+[.)]\s/.test(line)) {
      const ordered = /^\s*\d+[.)]\s/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s/.test(lines[i]) : /^\s*[-*]\s/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*(?:[-*]|\d+[.)])\s/, ""));
        i++;
      }
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={key}>
          {items.map((it, j) => (
            <li key={j}>{mdInline(it, `${key}-${j}`)}</li>
          ))}
        </Tag>
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={key}>{mdInline(para.join(" "), key)}</p>);
  }
  return <div className={className}>{blocks}</div>;
}
