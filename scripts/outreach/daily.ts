/**
 * The once-a-day outreach run. launchd starts it on weekday mornings (scripts/outreach/com.roal.outreach.plist).
 *
 *  1. Waits a random 0–30 minutes, so emails don't go out at the exact same minute every day.
 *  2. If fewer than REFILL_BELOW restaurants are left that haven't been emailed, pulls more leads
 *     (inside Google's free monthly limits, moving on to the next nearby area once the current ones are
 *     used up) and finds their emails.
 *  3. Sends 15–20 emails: follow-ups that are due first, then new restaurants.
 *  4. Shows a Mac notification with what was sent and how many owners have replied.
 *
 *   npm run outreach:daily            # the full run
 *   NO_WAIT=1 npm run outreach:daily  # skip the random wait
 */
import { spawnSync } from "node:child_process";

const REFILL_BELOW = Number(process.env.REFILL_BELOW ?? 40);
const MIN_PER_DAY = 15;
const MAX_PER_DAY = 20;

type Stats = {
  fresh: number;
  followUpsDue: number;
  contacted: number;
  replied: number;
  bounced: number;
  sentToday: number;
  byVariant: Record<string, { contacted: number; replied: number }>;
};

function run(script: string, env: Record<string, string> = {}) {
  console.log(`\n$ npm run ${script}`);
  const r = spawnSync("npm", ["run", "-s", script], { stdio: "inherit", env: { ...process.env, ...env } });
  return r.status === 0;
}

function stats(): Stats {
  const r = spawnSync("npm", ["run", "-s", "outreach:stats"], { encoding: "utf8" });
  const line = r.stdout.trim().split("\n").pop() ?? "{}";
  return JSON.parse(line) as Stats;
}

function notify(message: string) {
  console.log(`\n${message}`);
  const escaped = message.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  spawnSync("osascript", ["-e", `display notification "${escaped}" with title "ROAL outreach"`]);
}

void (async () => {
  console.log(`=== ${new Date().toString()} ===`);
  if (!process.env.NO_WAIT) {
    const wait = Math.random() * 30 * 60_000;
    console.log(`Waiting ${Math.round(wait / 60_000)} min before starting.`);
    await new Promise((r) => setTimeout(r, wait));
  }

  let before = stats();
  if (before.fresh < REFILL_BELOW) {
    console.log(`Only ${before.fresh} new restaurants left to email. Getting more.`);
    run("outreach:pull", { EXPAND: "1" });
    run("outreach:emails");
    before = stats();
  }

  const limit = MIN_PER_DAY + Math.floor(Math.random() * (MAX_PER_DAY - MIN_PER_DAY + 1));
  const ok = run("outreach:send", { DAILY_LIMIT: String(limit) });
  const after = stats();

  const sent = after.sentToday;
  const variants = Object.entries(after.byVariant)
    .filter(([v]) => v !== "original")
    .map(([v, x]) => `${v} ${x.replied}/${x.contacted}`)
    .join(", ");
  notify(
    ok
      ? `Sent ${sent} today. ${after.replied} replies so far from ${after.contacted} restaurants` +
          (variants ? ` (replies by version: ${variants}).` : ".") +
          ` ${after.fresh} new restaurants left.`
      : `Today's send stopped early after ${sent} emails. Check leads/daily.log.`,
  );
  if (after.fresh === 0 && after.followUpsDue === 0) {
    notify("Out of restaurants to email in every area set up. Add more areas in scripts/outreach/pull-restaurants.ts.");
  }
  process.exitCode = ok ? 0 : 1;
})();
