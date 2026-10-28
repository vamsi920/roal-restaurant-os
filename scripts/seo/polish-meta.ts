// Rewrites blog H1 titles, SEO titles and meta descriptions into natural English (no keyword stuffing).
// Run: npx tsx --env-file=.env.local scripts/seo/polish-meta.ts
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const MODEL = process.env.SEO_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const DIR = "content/blog";
type P = { slug: string; keyword: string; title: string; seoTitle: string; description: string; metaPolished?: boolean };

async function polish(batch: P[]): Promise<{ slug: string; title: string; seoTitle: string; description: string }[]> {
  const prompt = `Rewrite these restaurant-owner blog post titles and meta descriptions so they read like a careful human editor wrote them.
Rules:
- Keep each post's topic and search intent. Use the target query's meaning, but NEVER paste it ungrammatically ("open restaurant hoboken", "att call forwarding business" are wrong; "Opening a restaurant in Hoboken", "AT&T business call forwarding" are right). Proper capitalization for brands and places (AT&T, T-Mobile, NJ, Jersey City, ROAL).
- "title": the on-page H1, sentence case, 35-65 chars, specific and plain.
- "seoTitle": 40-60 chars total INCLUDING the suffix " | ROAL" if you add it (add it only if it fits). Lead with the words people search.
- "description": 125-155 chars, one or two natural sentences, says what the reader gets. No "Learn", no "Discover", no hype, no exclamation marks.
- No competitor or vendor brand names. No "never miss".
Posts:
${batch.map((p) => JSON.stringify({ slug: p.slug, query: p.keyword, title: p.title, seoTitle: p.seoTitle, description: p.description })).join("\n")}
Return JSON: {"posts": [{"slug": string, "title": string, "seoTitle": string, "description": string}]}`;
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 10000,
      reasoning_effort: "low",
    }),
  });
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  if (!r.ok) throw new Error(j.error?.message);
  return (JSON.parse(j.choices?.[0]?.message?.content ?? "{}") as { posts: { slug: string; title: string; seoTitle: string; description: string }[] }).posts;
}

async function main() {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  const posts = files.map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")) as P).filter((p) => !p.metaPolished);
  const batches: P[][] = [];
  for (let i = 0; i < posts.length; i += 15) batches.push(posts.slice(i, i + 15));
  let done = 0;
  let k = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (k < batches.length) {
        const b = batches[k++];
        for (let a = 1; a <= 3; a++) {
          try {
            const out = await polish(b);
            for (const o of out) {
              const p = b.find((x) => x.slug === o.slug);
              if (!p) continue;
              const ok = o.seoTitle.length >= 30 && o.seoTitle.length <= 62 && o.description.length >= 110 && o.description.length <= 160 && o.title.length >= 25 && o.title.length <= 75;
              if (!ok || /never miss|doordash|grubhub|uber eats/i.test(JSON.stringify(o))) continue;
              const file = `${DIR}/${p.slug}.json`;
              const full = JSON.parse(readFileSync(file, "utf8"));
              Object.assign(full, { title: o.title.trim(), seoTitle: o.seoTitle.trim(), description: o.description.trim(), metaPolished: true });
              writeFileSync(file, JSON.stringify(full, null, 2) + "\n");
              done++;
            }
            break;
          } catch (e) {
            if (a === 3) console.log("batch failed", (e as Error).message);
          }
        }
      }
    })
  );
  console.log(`polished ${done}/${posts.length}`);
}

main();
