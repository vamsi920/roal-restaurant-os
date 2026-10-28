// Crawls every sitemap URL and checks the basics search engines and answer engines care about.
// Run against a local production server or the live site:
//   npx tsx scripts/seo/audit.ts [--base http://localhost:3030] [--origin https://tryroal.com]
// Writes docs/seo/audit-latest.md.
import { writeFileSync, mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const arg = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const BASE = arg("--base", "http://localhost:3030").replace(/\/$/, "");
const ORIGIN = arg("--origin", "https://tryroal.com").replace(/\/$/, "");

type Issue = { url: string; problem: string };
const issues: Issue[] = [];
const inbound = new Map<string, number>();
const linkStatus = new Map<string, number>();

const local = (u: string) => u.replace(ORIGIN, BASE);
const pathOf = (u: string) => new URL(u, ORIGIN).pathname.replace(/\/$/, "") || "/";

async function get(url: string) {
  const r = await fetch(url, { redirect: "manual" });
  return { status: r.status, text: r.status === 200 ? await r.text() : "", type: r.headers.get("content-type") ?? "" };
}

function attr(html: string, re: RegExp) {
  return html.match(re)?.[1]?.trim();
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function main() {
  const xml = (await get(`${BASE}/sitemap.xml`)).text;
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  console.log(`${urls.length} URLs in sitemap`);
  const titles = new Map<string, string[]>();
  const sitemapPaths = new Set(urls.map(pathOf));

  await pool(urls, 12, async (url) => {
    const { status, text: html } = await get(local(url));
    const p = pathOf(url);
    if (status !== 200) return void issues.push({ url: p, problem: `status ${status}` });
    const title = attr(html, /<title>([^<]*)<\/title>/);
    const desc = attr(html, /<meta name="description" content="([^"]*)"/);
    const canonical = attr(html, /<link rel="canonical" href="([^"]*)"/);
    const ogImage = attr(html, /<meta property="og:image" content="([^"]*)"/);
    const robots = attr(html, /<meta name="robots" content="([^"]*)"/);
    const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
    if (!title) issues.push({ url: p, problem: "missing title" });
    else {
      const t = title.replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
      if (t.length > 65) issues.push({ url: p, problem: `title ${t.length} chars` });
      titles.set(t, [...(titles.get(t) ?? []), p]);
    }
    if (!desc) issues.push({ url: p, problem: "missing description" });
    else if (desc.length < 70 || desc.length > 170) issues.push({ url: p, problem: `description ${desc.length} chars` });
    if (!canonical) issues.push({ url: p, problem: "missing canonical" });
    else if (pathOf(canonical) !== p || !canonical.startsWith(ORIGIN)) issues.push({ url: p, problem: `canonical ${canonical}` });
    if (!ogImage) issues.push({ url: p, problem: "missing og:image" });
    if (robots && /noindex/.test(robots)) issues.push({ url: p, problem: "noindex on sitemap URL" });
    if (h1s !== 1) issues.push({ url: p, problem: `${h1s} h1 tags` });
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        JSON.parse(m[1]);
      } catch {
        issues.push({ url: p, problem: "invalid JSON-LD" });
      }
    }
    if (!/application\/ld\+json/.test(html)) issues.push({ url: p, problem: "no JSON-LD" });
    const links = new Set([...html.matchAll(/<a [^>]*href="(\/[^"#?]*)/g)].map((m) => m[1].replace(/\/$/, "") || "/"));
    for (const l of links) if (l !== p) inbound.set(l, (inbound.get(l) ?? 0) + 1);
  });

  // Check every internal link target once.
  const targets = [...inbound.keys()].filter((l) => !l.startsWith("/dashboard") && !l.startsWith("/api"));
  await pool(targets, 12, async (l) => {
    const r = await fetch(`${BASE}${l}`, { redirect: "manual" });
    linkStatus.set(l, r.status);
  });
  const broken = [...linkStatus].filter(([, s]) => s >= 400);
  const weak = [...sitemapPaths].filter((p) => p !== "/" && (inbound.get(p) ?? 0) < 3);
  const dupTitles = [...titles].filter(([, ps]) => ps.length > 1);

  const lines = [
    `# SEO audit (${new Date().toISOString().slice(0, 10)})`,
    "",
    `Base ${BASE}, ${urls.length} sitemap URLs, ${targets.length} internal link targets.`,
    "",
    `## Page issues (${issues.length})`,
    ...issues.sort((a, b) => a.url.localeCompare(b.url)).map((i) => `- ${i.url}: ${i.problem}`),
    "",
    `## Broken internal links (${broken.length})`,
    ...broken.map(([l, s]) => `- ${l}: ${s}`),
    "",
    `## Duplicate titles (${dupTitles.length})`,
    ...dupTitles.map(([t, ps]) => `- "${t}": ${ps.join(", ")}`),
    "",
    `## Weakly linked sitemap pages, under 3 links in (${weak.length})`,
    ...weak.map((p) => `- ${p} (${inbound.get(p) ?? 0})`),
    "",
  ];
  mkdirSync("docs/seo", { recursive: true });
  writeFileSync("docs/seo/audit-latest.md", lines.join("\n"));
  console.log(`issues ${issues.length}, broken links ${broken.length}, duplicate titles ${dupTitles.length}, weak pages ${weak.length}`);
}

main();
