import { importWebsiteMenuFromUrl } from "@/lib/restaurant-lookup/import-website-menu";
const t = Date.now();
importWebsiteMenuFromUrl(process.argv[2]).then((r) => {
  console.log("ms", Date.now() - t, r.ok ? { url: r.sourceUrl, model: r.modelUsed, cats: r.menu.categories.map((c) => `${c.name}:${c.items.length}`) , sample: r.menu.categories[0]?.items.slice(0,3)} : r);
});
