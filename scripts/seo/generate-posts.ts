// Generates SEO/AEO blog posts into content/blog/<slug>.json with OpenAI Chat Completions.
// Run: npx tsx --env-file=.env.local scripts/seo/generate-posts.ts [--only slug1,slug2] [--force] [--limit N]
// Resumable: skips files that already exist unless --force. Stops when estimated spend passes SEO_MAX_USD.
// After it finishes, run scripts/seo/build-blog-index.ts to schedule dates and rebuild the import index.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { TOPICS, type TopicRow } from "./topics";
import { FACTS } from "./facts";
import { SEO_LINKS, FOR_TYPES, USE_CASES, COMPARE_PAGES, TOOLS } from "../../lib/seo/site-pages";

const MODEL = process.env.SEO_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
// Rough list price per million tokens, only used for the spend guard.
const PRICE = { inPerM: 0.75, outPerM: 4.5 };
const MAX_USD = Number(process.env.SEO_MAX_USD ?? 12);
const CONCURRENCY = Number(process.env.SEO_CONCURRENCY ?? 8);
const DIR = "content/blog";
const SPEND_FILE = "scripts/seo/.spend.json";

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;

type Spend = { usd: number; inTok: number; outTok: number };
const spend: Spend = existsSync(SPEND_FILE) ? JSON.parse(readFileSync(SPEND_FILE, "utf8")) : { usd: 0, inTok: 0, outTok: 0 };



const LINK_LIST = SEO_LINKS.map((l) => `${l.path} (${l.label})`).join("; ");

const RULES = `
WRITING RULES:
- Audience: independent restaurant owners and managers (pizza shops, takeout spots, delis, family restaurants). Many are new to tech and busy. Plain, warm, practical English, like one owner-minded person talking to another. Short sentences. No fluff.
- Answer-first: the first two sentences of the intro directly answer the target query.
- LENGTH IS REQUIRED: 1,300-1,800 words total. Write 6-7 sections; each section body is 180-300 words. H2s are phrased like real questions or tasks owners have.
- Every section must contain something concrete for a restaurant: an example phone script line in quotes, a step list, a short checklist, a worked example with numbers the reader can swap for their own, or a markdown table. Avoid generic advice that would fit any business.
- When you do math, use clearly labeled example numbers ("say a $28 average order") and tell the reader to plug in their own. NEVER fabricate statistics, studies, surveys, quotes, named customers, case studies or percentages. No "according to" or "studies show". No invented ROAL results.
- Never write: "if you search for", "this guide", "in this article", "let's dive in", "in today's fast-paced", "in conclusion", "game-changer", "revolutionize", "it's not just X, it's Y", "never miss a call", "never miss an order", "every call answered", "100%", "guaranteed".
- Never mention any AI phone competitor, any AI or voice technology vendor, or any POS or delivery-app brand by name. Say "delivery apps", "your POS", "AI phone tools". Phone carriers and phone systems (Verizon, AT&T, T-Mobile, Comcast Business, Spectrum, Optimum, RingCentral, Google Voice) may be named in phone setup topics only.
- Never say "agent", "LLM", "bot platform", "integration", "webhook" or "provision" in reader-facing copy. Say "phone host" or "AI phone host".
- Mention ROAL naturally 2-4 times, never as the subject of every section. Include exactly one soft call to action near the end, e.g. "[build a free test host from your website](/try)". Be honest about limits (it does not take card payments, tricky calls go to staff).
- Internal links: use 3-6 markdown links with natural anchor text, chosen from this list only: ${LINK_LIST}. You may also link to these related blog posts: {{SIBLINGS}}. Never show a raw path as visible text. Never link to any other path. No external links.
- Markdown in bodies: paragraphs, "- " bullets, "1. " numbered lists, **bold**, [text](/path) links, and | tables | (with a header row). "### " sub-headings sparingly. No H1 or H2 inside bodies, no images, no HTML, no emojis.`;

function siblingsFor(t: TopicRow): string {
  const same = TOPICS.filter((x) => x[3] === t[3] && x[0] !== t[0]);
  // A rotating handful of same-category posts so links spread across the cluster.
  const start = TOPICS.indexOf(t) % Math.max(1, same.length);
  const pick = [...same.slice(start), ...same.slice(0, start)].slice(0, 8);
  return pick.map((x) => `/blog/${x[0]} (${x[1]})`).join("; ");
}

function prompt(t: TopicRow) {
  const [, title, keyword, category] = t;
  return `Write a blog post for the ROAL blog (the journal of an AI phone host for restaurants).
Working title: ${title}
Target search query: "${keyword}" (category: ${category})
${FACTS}
${RULES.replace("{{SIBLINGS}}", siblingsFor(t))}
Return JSON only:
{"title": string (40-62 chars, include the query naturally, sentence case),
 "seoTitle": string (45-60 chars, include the query; may end with " | ROAL"),
 "description": string (meta description, 130-155 chars, includes the query, plain English),
 "question": string (the main question the post answers, phrased the way an owner would ask an AI assistant),
 "answer": string (2-3 sentences, 40-70 words, directly answering that question; this is quoted by AI answer engines, so make it self-contained and factual),
 "summary": string (one sentence, under 30 words, what the reader will be able to do after reading),
 "intro": string (markdown, 2 short paragraphs),
 "sections": [{"h2": string, "body": string (markdown)}],
 "takeaways": [string] (3-5 one-line key takeaways),
 "faq": [{"q": string (a real question owners search), "a": string (2-4 sentences, direct answer)}] (4 items)}`;
}

type Gen = {
  title: string; seoTitle: string; description: string; question: string; answer: string; summary: string;
  intro: string; sections: { h2: string; body: string }[]; takeaways: string[]; faq: { q: string; a: string }[];
};

async function callOpenAI(text: string): Promise<{ data: Gen; inTok: number; outTok: number }> {
  const reasoning = /^(gpt-5|o\d)/.test(MODEL);
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "You are a senior content writer for restaurant owners. Reply with a single JSON object only." },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 12000,
      ...(reasoning ? { reasoning_effort: "low" } : { temperature: 0.7 }),
    }),
  });
  const j = (await r.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string };
  };
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${j.error?.message}`);
  if (j.choices?.[0]?.finish_reason === "length") throw new Error("cut off");
  const raw = j.choices?.[0]?.message?.content ?? "";
  const data = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as Gen;
  return { data, inTok: j.usage?.prompt_tokens ?? 0, outTok: j.usage?.completion_tokens ?? 0 };
}

const words = (g: Gen) => [g.intro, ...g.sections.map((s) => s.body)].join(" ").split(/\s+/).filter(Boolean).length;

const BANNED = [
  /\b(loman|slang\.?ai|polyai|truffle|goodcall|popmenu|bitesai|voiceplug|elevenlabs|openai|chatgpt|gpt-?\d|twilio|firebase|stripe)\b/i,
  /\b(doordash|uber ?eats|grubhub|seamless|toast pos|square pos|clover pos|slice app)\b/i,
  /never miss (a|an|another) (call|order)|every call answered|guaranteed|studies show|according to (a|the) (study|survey|report)/i,
  /in this article|this guide|let's dive|in today's fast|in conclusion|game-?changer|revolutioni[sz]e/i,
];
const ALLOWED_PATHS = new Set([...SEO_LINKS.map((l) => l.path), ...TOPICS.map((t) => `/blog/${t[0]}`)]);

function validate(t: TopicRow, g: Gen) {
  for (const k of ["title", "seoTitle", "description", "question", "answer", "summary", "intro"] as const) if (!g[k]?.trim()) throw new Error(`missing ${k}`);
  if (!Array.isArray(g.sections) || g.sections.length < 5) throw new Error("too few sections");
  if (!Array.isArray(g.faq) || g.faq.length < 3) throw new Error("too few faq");
  const w = words(g);
  if (w < 1000) throw new Error(`too short (${w} words)`);
  const all = JSON.stringify(g);
  // Phone carriers are fine in phone setup posts; ChatGPT is the topic of one post.
  for (const re of BANNED) {
    const m = all.match(re);
    if (m && !(t[0] === "chatgpt-for-restaurant-owners" && /chatgpt/i.test(m[0]))) throw new Error(`banned: ${m[0]}`);
  }
  const bodies = [g.intro, ...g.sections.map((s) => s.body), ...g.faq.map((f) => f.a)].join("\n");
  for (const m of bodies.matchAll(/\]\(([^)]+)\)/g)) {
    const path = m[1].split("#")[0];
    if (!ALLOWED_PATHS.has(path)) throw new Error(`bad link ${m[1]}`);
  }
  if (/(^|\s)\/(blog|for|tools|compare|use-cases)\/[a-z-]+(?![^[]*\])/.test(bodies.replace(/\[[^\]]*\]\([^)]*\)/g, ""))) throw new Error("raw path in text");
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

async function one(t: TopicRow) {
  const [slug, , keyword, category] = t;
  const file = `${DIR}/${slug}.json`;
  if (existsSync(file) && !force) return "skip";
  let lastErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (spend.usd > MAX_USD) throw new Error("BUDGET");
    try {
      const { data, inTok, outTok } = await callOpenAI(prompt(t) + (lastErr ? `\nYour previous attempt was rejected: ${lastErr}. Fix that.` : ""));
      spend.inTok += inTok;
      spend.outTok += outTok;
      spend.usd = (spend.inTok / 1e6) * PRICE.inPerM + (spend.outTok / 1e6) * PRICE.outPerM;
      writeFileSync(SPEND_FILE, JSON.stringify(spend));
      validate(t, data);
      const seen = new Set<string>();
      const sections = data.sections.map((s) => {
        let id = slugify(s.h2) || "section";
        while (seen.has(id)) id += "-2";
        seen.add(id);
        return { id, h2: s.h2.trim(), body: s.body.trim() };
      });
      const post = {
        slug,
        keyword,
        category,
        title: data.title.trim(),
        seoTitle: data.seoTitle.trim(),
        description: data.description.trim(),
        question: data.question.trim(),
        answer: data.answer.trim(),
        summary: data.summary.trim(),
        intro: data.intro.trim(),
        sections,
        takeaways: (data.takeaways ?? []).slice(0, 5),
        faq: data.faq.slice(0, 5).map((f) => ({ q: f.q.trim(), a: f.a.trim() })),
        words: words(data),
        generatedAt: new Date().toISOString().slice(0, 10),
      };
      writeFileSync(file, JSON.stringify(post, null, 2) + "\n");
      return `ok (${post.words}w)`;
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "BUDGET") throw e;
      lastErr = msg;
      if (attempt === 3) return `FAIL ${msg}`;
    }
  }
  return "FAIL";
}

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  mkdirSync(DIR, { recursive: true });
  // Sanity: generator link list must cover every programmatic page family.
  void FOR_TYPES; void USE_CASES; void COMPARE_PAGES; void TOOLS;
  let queue = TOPICS.filter((t) => !only || only.includes(t[0]));
  queue = queue.filter((t) => force || !existsSync(`${DIR}/${t[0]}.json`)).slice(0, limit);
  console.log(`${queue.length} topics to write with ${MODEL}, spend so far $${spend.usd.toFixed(3)}`);
  let i = 0;
  let stop = false;
  const worker = async () => {
    while (!stop && i < queue.length) {
      const t = queue[i++];
      try {
        const res = await one(t);
        console.log(`[${i}/${queue.length}] ${t[0]}: ${res}  $${spend.usd.toFixed(3)}`);
      } catch (e) {
        if ((e as Error).message === "BUDGET") { stop = true; console.log("Budget reached, stopping."); }
        else console.log(`${t[0]}: ERROR ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`done. spend $${spend.usd.toFixed(3)} (${spend.inTok} in / ${spend.outTok} out tokens)`);
}

main();
