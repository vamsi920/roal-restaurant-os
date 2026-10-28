// Run after a deploy: npx tsx scripts/seo/indexnow.ts [--dry] [--only-new]
// Pings IndexNow (Bing, Yandex, Seznam, Naver and others share it) with every URL in the live sitemap
// plus docs/seo/urls.txt (optional, one URL per line). The key file is public/ad54dac3a4a7e49bc3e26cee1867cb85.txt.
// --only-new sends only blog posts published today (for the daily drip).
import { existsSync, readFileSync } from "node:fs";

const HOST = "tryroal.com";
const KEY = "ad54dac3a4a7e49bc3e26cee1867cb85";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const dry = process.argv.includes("--dry");
const onlyNew = process.argv.includes("--only-new");

async function main() {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  const today = new Date().toISOString().slice(0, 10);
  const entries = [...xml.matchAll(/<url>\s*<loc>(.*?)<\/loc>\s*<lastmod>(.*?)<\/lastmod>/g)].map((m) => ({ loc: m[1].trim(), lastmod: m[2] }));
  const urls = new Set(entries.filter((e) => !onlyNew || (e.loc.includes("/blog/") && e.lastmod.startsWith(today))).map((e) => e.loc));
  if (!onlyNew && existsSync("docs/seo/urls.txt")) {
    for (const l of readFileSync("docs/seo/urls.txt", "utf8").split("\n")) if (l.trim().startsWith("http")) urls.add(l.trim());
  }
  const list = [...urls].filter((u) => new URL(u).host === HOST);
  console.log(`${list.length} URLs`);
  if (dry || !list.length) return console.log(list.join("\n"));
  for (let i = 0; i < list.length; i += 10000) {
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: list.slice(i, i + 10000) }),
    });
    console.log(`batch ${i / 10000 + 1}: ${r.status} ${r.statusText}`, await r.text());
  }
}

main();
