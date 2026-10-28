/**
 * Visits each lead's website (home page plus a few likely contact pages) and pulls the
 * public contact emails it lists. Reads leads/restaurants.json, writes leads/leads.csv
 * with an `email` column (best guess) and `other_emails`.
 *
 *   npm run outreach:emails
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { toCsv } from "./csv";

type Lead = Record<string, string | number> & { name: string; website: string };

const CONCURRENCY = 10;
const TIMEOUT_MS = 10_000;
const PATHS = ["", "/contact", "/contact-us", "/about", "/about-us", "/catering", "/private-events"];

// Ordering platforms and site builders whose pages never hold the owner's own address.
const SKIP_HOSTS = /doordash|ubereats|grubhub|seamless|slicelife|toasttab|chownow|menufy|order\.online|facebook|instagram|yelp|google\./i;
const JUNK = /\.(png|jpe?g|gif|svg|webp|css|js)$|example\.|my(site|store|domain)\.|your(site|store|domain|email)\.|sentry|wixpress|godaddy|squarespace|domain\.com|yourname|email\.com|@sentry|noreply|no-reply|privacy@|abuse@|webmaster@/i;
const EMAIL = /[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

async function get(url: string) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36" },
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return "";
    return await res.text();
  } catch {
    return "";
  }
}

function decode(html: string) {
  // Undo the common obfuscations: HTML entities, "[at]"/"(at)", and URL-encoded mailto links.
  return html
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/%40/g, "@")
    .replace(/%[0-9a-f]{2}/gi, " ") // leftover URL-encoding (e.g. Outlook safelinks) would glue junk onto an address
    .replace(/\s*[[(]at[\])]\s*/gi, "@")
    .replace(/\s*[[(]dot[\])]\s*/gi, ".");
}

async function emailsFor(website: string) {
  let origin: string;
  try {
    const u = new URL(website);
    if (SKIP_HOSTS.test(u.hostname)) return [];
    origin = u.origin;
  } catch {
    return [];
  }
  const found = new Set<string>();
  for (const path of PATHS) {
    const html = decode(await get(origin + path));
    for (const m of html.match(EMAIL) ?? []) {
      const e = m.toLowerCase().replace(/^\.+|\.+$/g, "");
      if (!JUNK.test(e)) found.add(e);
    }
    if (found.size && path) break; // home + first contact page with a hit is enough
  }
  // Prefer an address on the restaurant's own domain, then the usual owner-facing inboxes.
  const host = new URL(origin).hostname.replace(/^www\./, "");
  const score = (e: string) =>
    (e.endsWith("@" + host) ? 0 : 10) + (/^(owner|info|hello|contact|manager|catering|events)@/.test(e) ? 0 : 1);
  return [...found].sort((a, b) => score(a) - score(b));
}

void (async () => {
  const leads: Lead[] = JSON.parse(readFileSync("leads/restaurants.json", "utf8"));
  // Keep earlier results (and any status typed into the sheet): only places that are new, or whose
  // website changed, get visited again.
  const prior = new Map<string, Record<string, unknown>>();
  if (existsSync("leads/leads.json")) {
    for (const r of JSON.parse(readFileSync("leads/leads.json", "utf8")) as Record<string, unknown>[]) {
      prior.set(String(r.place_id), r);
    }
  }
  const out: Record<string, unknown>[] = new Array(leads.length);
  let next = 0;
  let done = 0;

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < leads.length) {
        const i = next++;
        const l = leads[i];
        const old = prior.get(String(l.place_id));
        if (old && old.website === l.website) {
          out[i] = { ...l, email: old.email ?? "", other_emails: old.other_emails ?? "", status: old.status ?? "" };
          done++;
          continue;
        }
        const emails = l.website ? await emailsFor(l.website) : [];
        out[i] = { ...l, email: emails[0] ?? "", other_emails: emails.slice(1, 4).join(" "), status: "" };
        if (++done % 50 === 0) console.log(`${done}/${leads.length}`);
      }
    }),
  );

  writeFileSync("leads/leads.json", JSON.stringify(out, null, 2));
  writeFileSync("leads/leads.csv", toCsv(out));
  const withEmail = out.filter((r) => r.email).length;
  console.log(`\n${withEmail} of ${out.length} have an email. Wrote leads/leads.csv`);
})();
