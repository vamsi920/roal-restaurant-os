// Generates copy for the programmatic SEO pages into content/pages/<family>/<slug>.json
// and the glossary into content/glossary.json, with OpenAI Chat Completions.
// Run: npx tsx --env-file=.env.local scripts/seo/generate-pages.ts [--family for|use-cases|compare|locations|glossary] [--force]
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { FACTS } from "./facts";
import { COMPARE_PAGES, FOR_TYPES, LOCATIONS, SEO_LINKS, USE_CASES, type SeoPageRef } from "../../lib/seo/site-pages";
import { GLOSSARY_TERMS } from "../../lib/seo/glossary-terms";

const MODEL = process.env.SEO_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const args = process.argv.slice(2);
const force = args.includes("--force");
const family = args.includes("--family") ? args[args.indexOf("--family") + 1] : null;

const LINKS = SEO_LINKS.map((l) => `${l.path} (${l.label})`).join("; ");

const RULES = `
RULES:
- Audience: busy independent restaurant owners, many new to tech. Plain, warm, specific English. Short sentences.
- Be concrete to this exact page topic: real menu items, real call situations, real rush moments for this kind of restaurant or situation. Nothing that would fit any page.
- NEVER invent statistics, studies, customers, testimonials, quotes, or ROAL results. Use clearly labeled example numbers only ("say 12 missed calls on a Friday").
- Never name AI phone competitors, AI/voice tech vendors, POS brands or delivery app brands. Never say "agent", "LLM", "integration", "webhook". Say "phone host".
- Never claim "never miss a call", "every call", "100%", "guaranteed".
- Markdown in body fields: paragraphs, "- " bullets, "1. " lists, **bold**, [text](/path) links, | tables |. Links only to: ${LINKS}. 2-4 links total across the page. No raw paths as text.
${FACTS}`;

type Json = Record<string, unknown>;

async function call(prompt: string): Promise<Json> {
  const reasoning = /^(gpt-5|o\d)/.test(MODEL);
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "You write landing page copy for restaurant owners. Reply with a single JSON object only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 12000,
      ...(reasoning ? { reasoning_effort: "low" } : { temperature: 0.7 }),
    }),
  });
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${j.error?.message}`);
  const raw = j.choices?.[0]?.message?.content ?? "";
  return JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as Json;
}

const BANNED = /\b(loman|slang\.?ai|polyai|truffle|goodcall|maple|kea|elevenlabs|openai|chatgpt|twilio|doordash|uber ?eats|grubhub|seamless)\b|never miss (a|an) (call|order)|guaranteed|studies show/i;

const LANDING_SHAPE = `{"h1": string (under 60 chars),
 "seoTitle": string (45-60 chars, includes the main query, may end " | ROAL"),
 "description": string (130-155 chars),
 "lead": string (1-2 sentences under the h1),
 "question": string (the main question an owner would ask an AI assistant about this),
 "answer": string (2-3 sentences, 40-70 words, self-contained, factual),
 "pains": [{"title": string, "body": string (1-2 sentences)}] (3 items, specific to this topic),
 "howItHelps": [{"title": string, "body": string (1-2 sentences)}] (4 items),
 "sampleCall": [{"who": "caller" | "host", "line": string}] (6-8 lines: a realistic call for this topic; the host is warm and brief; if it is an order, include items, modifiers, name, ready time and a read-back),
 "sampleTicket": {"title": string (e.g. "Pickup · 7:15 pm"), "lines": [string] (3-6 ticket lines), "note": string (short kitchen note or "")},
 "sections": [{"h2": string, "body": string (markdown, 150-250 words)}] (3 items: practical owner advice for this topic, e.g. a phone checklist, menu tips, a worked example),
 "faq": [{"q": string, "a": string (2-4 sentences)}] (5 items)}`;

function forPrompt(p: SeoPageRef) {
  return `Write the landing page "ROAL for ${p.label}": an AI phone host that answers calls and takes pickup orders for ${p.label.toLowerCase()}. Target queries: "AI phone answering for ${p.label.toLowerCase()}", "${p.label.toLowerCase()} phone orders".
${RULES}
Return JSON: ${LANDING_SHAPE}`;
}

function useCasePrompt(p: SeoPageRef) {
  return `Write the use-case landing page "${p.label}" for ROAL: how an AI phone host helps restaurants with ${p.label.toLowerCase()}. Target query: "AI phone answering ${p.label.toLowerCase()} restaurant".
${RULES}
Return JSON: ${LANDING_SHAPE}`;
}

function locationPrompt(p: SeoPageRef) {
  return `Write the local landing page "AI phone host for restaurants in ${p.label}". The founder lives in Jersey City and the first restaurants are in Jersey City and Hoboken. Mention real, well-known neighborhoods and busy patterns (commuters, weekend brunch, game nights) only in general terms you are confident are true; never invent businesses, addresses or numbers. Target query: "AI phone answering restaurants ${p.label}".
${RULES}
Return JSON: ${LANDING_SHAPE}`;
}

function comparePrompt(p: SeoPageRef) {
  return `Write the comparison page "${p.label}" for restaurant owners. Compare ROAL (AI phone host, $0.90 per completed order) with the category, fairly and honestly, including where the other option is the better choice. Never name a specific company.
${RULES}
Return JSON: ${LANDING_SHAPE.replace('"faq"', `"table": {"otherName": string (short column name for the other option), "rows": [{"label": string, "roal": string, "other": string}] (8-10 rows: cost model, setup, rush-hour capacity, menu knowledge, kitchen tickets, languages, after hours, handoff to staff, best for)},
 "verdict": string (2-3 sentences: who should pick which),
 "faq"`)}`;
}

function glossaryPrompt(terms: { slug: string; term: string }[]) {
  return `Write glossary entries for a restaurant phone ordering glossary used by restaurant owners. Terms: ${terms.map((t) => `${t.slug} = "${t.term}"`).join("; ")}.
For each term: "short" (one plain sentence definition, under 30 words, quotable by AI assistants) and "body" (markdown, 90-160 words: what it means in a real restaurant, an example, why it matters for phone orders). Link 0-2 times using only: ${LINKS}.
${RULES}
Return JSON: {"entries": [{"slug": string, "term": string, "short": string, "body": string}]}`;
}

function check(o: Json, compare = false) {
  const need = ["h1", "seoTitle", "description", "lead", "question", "answer", "pains", "howItHelps", "sampleCall", "sampleTicket", "sections", "faq"];
  if (compare) need.push("table", "verdict");
  for (const k of need) if (!o[k]) throw new Error(`missing ${k}`);
  const m = JSON.stringify(o).match(BANNED);
  if (m) throw new Error(`banned: ${m[0]}`);
  const allowed = new Set(SEO_LINKS.map((l) => l.path));
  for (const l of JSON.stringify(o).matchAll(/\]\((\/[^)]*)\)/g)) if (!allowed.has(l[1])) throw new Error(`bad link ${l[1]}`);
}

async function page(dir: string, p: SeoPageRef, prompt: string, compare = false) {
  const file = `content/pages/${dir}/${p.slug}.json`;
  if (existsSync(file) && !force) return console.log(`${file}: skip`);
  let err = "";
  for (let a = 1; a <= 3; a++) {
    try {
      const o = await call(prompt + (err ? `\nPrevious attempt rejected: ${err}. Fix it.` : ""));
      check(o, compare);
      writeFileSync(file, JSON.stringify({ slug: p.slug, label: p.label, ...o }, null, 2) + "\n");
      return console.log(`${file}: ok`);
    } catch (e) {
      err = (e as Error).message;
    }
  }
  console.log(`${file}: FAIL ${err}`);
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  for (const d of ["for", "use-cases", "compare", "locations"]) mkdirSync(`content/pages/${d}`, { recursive: true });
  const jobs: (() => Promise<void>)[] = [];
  if (!family || family === "for") for (const p of FOR_TYPES) jobs.push(() => page("for", p, forPrompt(p)));
  if (!family || family === "use-cases") for (const p of USE_CASES) jobs.push(() => page("use-cases", p, useCasePrompt(p)));
  if (!family || family === "compare") for (const p of COMPARE_PAGES) jobs.push(() => page("compare", p, comparePrompt(p), true));
  if (!family || family === "locations") for (const p of LOCATIONS) jobs.push(() => page("locations", p, locationPrompt(p)));
  if ((!family || family === "glossary") && (force || !existsSync("content/glossary.json"))) {
    jobs.push(async () => {
      const out: Json[] = [];
      for (let i = 0; i < GLOSSARY_TERMS.length; i += 10) {
        const chunk = GLOSSARY_TERMS.slice(i, i + 10);
        for (let a = 1; a <= 3; a++) {
          try {
            const o = (await call(glossaryPrompt(chunk))) as { entries: Json[] };
            const m = JSON.stringify(o).match(BANNED);
            if (m) throw new Error(`banned ${m[0]}`);
            out.push(...o.entries);
            break;
          } catch (e) {
            if (a === 3) console.log(`glossary chunk ${i}: FAIL ${(e as Error).message}`);
          }
        }
      }
      writeFileSync("content/glossary.json", JSON.stringify(out, null, 2) + "\n");
      console.log(`glossary: ${out.length} entries`);
    });
  }
  await pool(jobs, 6, (j) => j());
}

main();
