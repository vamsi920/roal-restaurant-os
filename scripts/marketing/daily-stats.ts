/**
 * Prints yesterday's and today's growth numbers (same data as /dashboard/admin/stats).
 *   npm run stats:daily          # human-readable
 *   npm run stats:daily -- --json
 */
import { loadGrowthStats } from "@/lib/admin/load-growth-stats";
import { getDb } from "@/lib/db";

async function main() {
  const stats = await loadGrowthStats(getDb());
  if (process.argv.includes("--json")) {
    const { series, ...rest } = stats;
    console.log(JSON.stringify({ ...rest, last14: series.slice(-14) }, null, 2));
    return;
  }
  const row = (label: string, k: keyof typeof stats.today) =>
    `${label.padEnd(26)} ${String(stats.yesterday[k]).padStart(6)} ${String(stats.today[k]).padStart(6)} ${String(stats.last7[k]).padStart(6)} ${String(stats.last30[k]).padStart(7)}`;
  console.log(`ROAL growth stats (${stats.generatedAt})`);
  console.log(`${"".padEnd(26)} ${"yday".padStart(6)} ${"today".padStart(6)} ${"7d".padStart(6)} ${"30d".padStart(7)}`);
  console.log(row("Visitors", "visitors"));
  console.log(row("Page views", "views"));
  console.log(row("Visits from Meta ads", "adVisits"));
  console.log(row("Demos started", "demos"));
  console.log(row("Demo leads", "leads"));
  console.log(row("Sign-ups", "signups"));
  console.log(row("Restaurants created", "restaurants"));
  console.log(row("Calls", "calls"));
  console.log(row("Orders", "orders"));
  const list = (t: string, rows: { label: string; count: number }[]) =>
    console.log(`${t}: ${rows.map((r) => `${r.label} ${r.count}`).join(", ") || "none"}`);
  list("Sources (7d)", stats.sources);
  list("Top pages (7d)", stats.topPages.slice(0, 8));
  list("Campaigns (30d)", stats.campaigns);
  console.log(`Newest sign-ups: ${stats.recentSignups.slice(0, 5).map((u) => `${u.email} (${u.createdAt.slice(0, 10)})`).join(", ") || "none"}`);
  for (const n of stats.notes) console.log(`Note: ${n}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
