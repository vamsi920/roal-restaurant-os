/** Daily: tell IndexNow (Bing, Yandex, Seznam, Naver...) about blog posts that went live today. */
const HOST = "tryroal.com";
const KEY = "ad54dac3a4a7e49bc3e26cee1867cb85";

export default async () => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>\s*<lastmod>(.*?)<\/lastmod>/g)]
    .filter((m) => m[1].includes("/blog/") && m[2].startsWith(today))
    .map((m) => m[1]);
  // Hubs that list the new posts change too.
  urls.push(`https://${HOST}/blog`, `https://${HOST}/sitemap.xml`);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
  });
  console.log("[indexnow-daily]", today, urls.length, res.status);
};

// 10:15 ET in winter (14:15 UTC): after the hourly revalidation has picked up the day's posts.
export const config = { schedule: "15 14 * * *" };
