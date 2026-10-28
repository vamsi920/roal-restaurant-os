/**
 * Sends the cold outreach sequence from a Gmail account, slowly, like a person would.
 *
 *   npm run outreach:preview   # writes leads/preview.txt, sends nothing
 *   npm run outreach:send      # sends today's batch
 *
 * Needs in .env.local: GMAIL_USER and GMAIL_APP_PASSWORD (a Google "app password", not the
 * normal password). Optional: DAILY_LIMIT (default 30), GAP_MIN_SEC / GAP_MAX_SEC (default 90 / 240).
 *
 * Each run:
 *  1. Reads the inbox over IMAP. Anyone who replied, bounced or asked to stop is never emailed again.
 *  2. Sends follow-ups that are due (day 3, then day 8, in the same thread), then new leads,
 *     best-fit restaurants first, up to DAILY_LIMIT sends per day in total.
 *  3. Waits a random 90–240s between emails and saves progress after every send
 *     (leads/send-state.json), so it can be stopped and re-run at any time.
 * Add any address to leads/suppress.txt (one per line) to stop it by hand.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { toCsv } from "./csv";

type Lead = {
  name: string;
  city: string;
  type: string;
  reviews: number | string;
  rating: number | string;
  email: string;
  chain: string;
  status?: string;
  [k: string]: unknown;
};
type Sent = { step: 1 | 2 | 3; at: string; messageId: string; subject: string };
type Contact = { sent: Sent[]; stopped?: "replied" | "bounced" | "suppressed" };
type State = { contacts: Record<string, Contact> };

const PREVIEW = process.argv.includes("--preview");
const USER = process.env.GMAIL_USER ?? "";
const PASS = (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "");
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT ?? 30);
const GAP_MIN = Number(process.env.GAP_MIN_SEC ?? 90);
const GAP_MAX = Number(process.env.GAP_MAX_SEC ?? 240);
const FROM_NAME = process.env.OUTREACH_FROM_NAME ?? "Vamsi";

const STATE_FILE = "leads/send-state.json";
const DAY = 86_400_000;
const FOLLOW_UP_DAYS = { 2: 3, 3: 5 } as const; // step 2 three days after step 1, step 3 five days after step 2

const FOOTER =
  "Vamsi\nROAL · tryroal.com · 207 South St, Jersey City, NJ 07307\n" +
  'If you\'d rather not hear from me, reply "no" and I won\'t email again.';

// ---------- copy ----------

function cleanName(raw: string) {
  // "Vatan Indian Vegetarian Cuisine & Bakery, Jersey City" → "Vatan Indian Vegetarian Cuisine & Bakery"
  let n = raw
    .split(/\s+[|–-]\s+/)[0]
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/[^\x00-ɏ]+/g, " ")
    .replace(/,?\s+(jersey city|hoboken|jc|nj)\s*$/i, "")
    .replace(/[\s.,·]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (n === n.toUpperCase()) n = n.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return n;
}

function opener(l: Lead, name: string) {
  const t = l.type.toLowerCase();
  const reviews = Number(l.reviews) || 0;
  if (reviews >= 500) return `${reviews.toLocaleString("en-US")} Google reviews — the phone at ${name} must be ringing nonstop on Friday nights.`;
  if (/pizza|chinese|indian|takeout|delivery|fast food|chicken|halal|wings|sandwich|deli|burger/.test(t))
    return `Takeout spots like ${name} lose the most orders when the phone rings in the middle of the 7pm rush.`;
  if (/cafe|coffee|bakery|dessert|bagel|tea|juice|ice cream/.test(t))
    return `Catering and big pickup orders usually come in by phone — right when the counter is busiest.`;
  return `When the dining room is full, the phone usually goes to voicemail — and those are orders lost.`;
}

function compose(l: Lead, step: 1 | 2 | 3) {
  const name = cleanName(l.name);
  const subject = `phone orders at ${name}`;
  if (step === 1) {
    return {
      subject,
      text: [
        `Hi ${name} team,`,
        opener(l, name),
        `I'm Vamsi, I live in Jersey City. I built ROAL, an AI host that answers your phone when the line is busy and sends the full order straight to your kitchen.`,
        `No monthly fee — $0.90 only when an order actually comes through.`,
        `Want to try it? tryroal.com/try builds a test line from your real menu in about 5 minutes, and you can call it yourself. Or just reply and I'll set it up for you.`,
        FOOTER,
      ].join("\n\n"),
    };
  }
  if (step === 2) {
    return {
      subject: `Re: ${subject}`,
      text: [
        `Hi again — quick bump on this. Happy to build the test line for ${name} myself and send you the number to call. Worth 5 minutes?`,
        FOOTER,
      ].join("\n\n"),
    };
  }
  return {
    subject: `Re: ${subject}`,
    text: [
      `Last note from me. Friday and Saturday nights are when most calls get missed — if that's ever a problem at ${name}, reply and I'll set it up for free. Either way, good luck this season.`,
      FOOTER,
    ].join("\n\n"),
  };
}

// ---------- state ----------

function loadState(): State {
  return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : { contacts: {} };
}

function saveState(s: State) {
  writeFileSync(STATE_FILE + ".tmp", JSON.stringify(s, null, 2));
  renameSync(STATE_FILE + ".tmp", STATE_FILE);
}

function suppressed() {
  if (!existsSync("leads/suppress.txt")) return new Set<string>();
  return new Set(
    readFileSync("leads/suppress.txt", "utf8")
      .split("\n")
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Marks contacts who replied or bounced, from the Gmail inbox. */
async function checkInbox(s: State) {
  const contacted = Object.entries(s.contacts).filter(([, c]) => !c.stopped && c.sent.length);
  if (!contacted.length) return;
  const since = new Date(Math.min(...contacted.map(([, c]) => Date.parse(c.sent[0].at))));
  const client = new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    const open = new Map(contacted.map(([email, c]) => [email, c]));
    const bounceUids: number[] = [];
    // Envelopes only: a personal inbox can be large, so full bodies are fetched just for bounces.
    for await (const msg of client.fetch({ since }, { envelope: true, uid: true })) {
      const from = msg.envelope?.from?.[0]?.address?.toLowerCase() ?? "";
      const contact = open.get(from);
      if (contact) {
        contact.stopped = "replied";
        console.log(`reply from ${from}`);
      } else if (/mailer-daemon|postmaster/.test(from)) {
        bounceUids.push(msg.uid);
      }
    }
    if (bounceUids.length) {
      for await (const msg of client.fetch(bounceUids, { source: true }, { uid: true })) {
        const body = msg.source?.toString("utf8").toLowerCase() ?? "";
        for (const [email, c] of open) {
          if (!c.stopped && body.includes(email)) {
            c.stopped = "bounced";
            console.log(`bounce for ${email}`);
          }
        }
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }
  saveState(s);
}

// ---------- queue ----------

function fitScore(l: Lead) {
  const t = l.type.toLowerCase();
  const takeout = /pizza|chinese|indian|takeout|delivery|fast food|chicken|halal|wings|deli|mexican|thai|sushi|burger/.test(t);
  return (takeout ? 10_000 : 0) + (Number(l.reviews) || 0);
}

const FREE_MAIL = /@(gmail|googlemail|yahoo|ymail|outlook|hotmail|live|msn|aol|icloud|me|comcast|verizon|optonline)\./i;

/** The address belongs to the restaurant: on its own website's domain, or a free inbox it lists. */
function ownAddress(l: Lead) {
  if (FREE_MAIL.test(l.email)) return true;
  const domain = l.email.split("@")[1]?.toLowerCase() ?? "";
  const root = (h: string) => h.replace(/^www\./, "").split(".").slice(-2).join(".");
  try {
    return root(new URL(String(l.website)).hostname) === root(domain);
  } catch {
    return false;
  }
}

function buildQueue(leads: Lead[], s: State, stop: Set<string>) {
  const now = Date.now();
  const due: { lead: Lead; step: 1 | 2 | 3 }[] = [];
  const fresh: { lead: Lead; step: 1 | 2 | 3 }[] = [];
  const seen = new Set<string>();
  for (const l of leads) {
    const email = l.email.toLowerCase();
    if (!email || l.chain || seen.has(email)) continue;
    seen.add(email);
    if (stop.has(email) || /^(no|replied|trial|bounced)$/i.test(l.status ?? "")) continue;
    const c = s.contacts[email];
    if (c?.stopped) continue;
    if (!c || !c.sent.length) {
      // Agencies and web designers often leave their own address on a client's site.
      if (ownAddress(l)) fresh.push({ lead: l, step: 1 });
      continue;
    }
    const last = c.sent[c.sent.length - 1];
    if (last.step === 3) continue;
    const next = (last.step + 1) as 2 | 3;
    if (now - Date.parse(last.at) >= FOLLOW_UP_DAYS[next] * DAY) due.push({ lead: l, step: next });
  }
  fresh.sort((a, b) => fitScore(b.lead) - fitScore(a.lead));
  return [...due, ...fresh];
}

function sentToday(s: State) {
  const today = new Date().toDateString();
  return Object.values(s.contacts).reduce(
    (n, c) => n + c.sent.filter((x) => new Date(x.at).toDateString() === today).length,
    0,
  );
}

function writeLeadStatuses(leads: Lead[], s: State) {
  const label = (l: Lead) => {
    const c = s.contacts[l.email.toLowerCase()];
    if (!c) return l.status ?? "";
    if (c.stopped) return c.stopped;
    return c.sent.length ? `sent ${c.sent.length}` : (l.status ?? "");
  };
  const rows = leads.map((l) => ({ ...l, status: label(l) }));
  writeFileSync("leads/leads.json", JSON.stringify(rows, null, 2));
  writeFileSync("leads/leads.csv", toCsv(rows));
}

// ---------- main ----------

void (async () => {
  const leads: Lead[] = JSON.parse(readFileSync("leads/leads.json", "utf8"));
  const s = loadState();
  const stop = suppressed();

  if (PREVIEW) {
    const queue = buildQueue(leads, s, stop);
    const sample = queue.slice(0, DAILY_LIMIT);
    const out = sample
      .map(({ lead, step }) => {
        const m = compose(lead, step);
        return `To: ${lead.email}\nSubject: ${m.subject}\n\n${m.text}`;
      })
      .join("\n\n" + "=".repeat(70) + "\n\n");
    writeFileSync("leads/preview.txt", out + "\n");
    console.log(`${queue.length} emails in the queue. Wrote the next ${sample.length} to leads/preview.txt (nothing sent).`);
    return;
  }

  if (!USER || !PASS) throw new Error("Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local");
  const hour = new Date().getHours();
  const weekday = new Date().getDay();
  if (!process.env.FORCE && (weekday === 0 || weekday === 6 || hour < 9 || hour >= 17)) {
    throw new Error("Only sends on weekdays, 9am–5pm, when owners read email. Set FORCE=1 to override.");
  }

  await checkInbox(s);
  const budget = DAILY_LIMIT - sentToday(s);
  const queue = buildQueue(leads, s, stop).slice(0, Math.max(0, budget));
  console.log(`Sending ${queue.length} today (limit ${DAILY_LIMIT}, already sent ${DAILY_LIMIT - budget}).`);

  const smtp = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: USER, pass: PASS } });
  await smtp.verify();

  try {
    for (const [i, { lead, step }] of queue.entries()) {
      const email = lead.email.toLowerCase();
      const contact = (s.contacts[email] ??= { sent: [] });
      const first = contact.sent[0];
      const m = compose(lead, step);
      const info = await smtp.sendMail({
        from: `"${FROM_NAME}" <${USER}>`,
        to: lead.email,
        subject: m.subject,
        text: m.text,
        ...(first ? { inReplyTo: first.messageId, references: [first.messageId] } : {}),
      });
      contact.sent.push({ step, at: new Date().toISOString(), messageId: info.messageId, subject: m.subject });
      saveState(s);
      console.log(`${i + 1}/${queue.length} step ${step} → ${lead.email} (${cleanName(lead.name)})`);
      if (i < queue.length - 1) {
        const wait = (GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN)) * 1000;
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  } finally {
    writeLeadStatuses(leads, s);
  }
  console.log("Done for today.");
})();
