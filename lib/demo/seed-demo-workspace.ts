import type { Db, Row } from "@/lib/db";
import { DEMO_USER } from "@/lib/auth/session-user";
import { TRIAL_VOICE_OPTIONS } from "@/lib/trial/voices";
import { demoMenuPrice, demoMenuRpcPayload } from "@/lib/demo/demo-menu";
import { ELEVENLABS_CONVERSATION_INIT_PATH, getSiteOrigin } from "@/lib/site-url";

/**
 * Demo workspace seed (demo mode only — the in-memory store).
 *
 * Creates one clearly fictional restaurant, "Maria's Trattoria" in Austin TX, with a
 * menu, FAQ, upsell rules, ~40 calls over the last 14 days, matching orders and
 * receipts, reservations and knowledge suggestions, so every dashboard page has data.
 *
 * Idempotent: if the demo organization already exists nothing is re-created; only the
 * "happening now" rows (active call + live tickets) are re-timed when they went stale.
 *
 * Rows are tagged `transcript_metadata.demo_seed = true` / `metadata.demo_seed = true`.
 * Session ids use the `demo-call-` prefix — never `roal-harness-` — so the analytics /
 * billing test-call exclusion (lib/analytics/exclude-test-sessions.ts) keeps them.
 */

export const DEMO_ORG_SLUG = "marias-trattoria-demo";
export const DEMO_ORG_NAME = "Maria's Trattoria";
export const DEMO_RESTAURANT_NAME = "Maria's Trattoria";
export const DEMO_AGENT_ID = "agent_demo_marias_trattoria";
export const DEMO_SESSION_PREFIX = "demo-call-";
/** Bump when the seeded data changes; existing demo orgs get `upgradeDemoWorkspace`. */
export const DEMO_SEED_VERSION = 2;
const DEMO_PHONE = "+15125550142";
const TAX_RATE = 8.25;

export type SeedDemoResult = {
  seeded: boolean;
  organizationId: string;
  restaurantId: string;
};

/* ---------------------------------------------------------------- helpers */

/** Small deterministic PRNG so the demo looks the same on every machine. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (ms: number) => new Date(ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function must<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`[demo seed] ${what}: ${res.error.message}`);
  return res.data;
}

/** Minutes east of UTC for America/Chicago at `ms` (handles CST/CDT). */
function chicagoOffsetMinutes(ms: number): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      timeZoneName: "shortOffset",
    }).formatToParts(new Date(ms));
    const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
    const m = tz.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return -300;
    const sign = m[1] === "-" ? -1 : 1;
    return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
  } catch {
    return -300;
  }
}

/** Epoch ms for `daysAgo` days before `now` at local Austin time hh:mm. */
function austinTime(now: number, daysAgo: number, hour: number, minute: number): number {
  const offset = chicagoOffsetMinutes(now);
  const local = new Date(now + offset * MIN);
  const y = local.getUTCFullYear();
  const mo = local.getUTCMonth();
  const d = local.getUTCDate() - daysAgo;
  return Date.UTC(y, mo, d, hour, minute) - offset * MIN;
}

type Line = { name: string; quantity: number; customizations?: string[]; notes?: string | null };

function storedLines(lines: Line[]) {
  return lines.map((l) => {
    const base = demoMenuPrice(l.name);
    const extras = (l.customizations ?? []).reduce((sum, c) => sum + (CUSTOMIZATION_PRICES[c] ?? 0), 0);
    return {
      name: l.name,
      quantity: l.quantity,
      customizations: l.customizations ?? [],
      notes: l.notes ?? null,
      unit_price: Math.round((base + extras) * 100) / 100,
    };
  });
}

const CUSTOMIZATION_PRICES: Record<string, number> = {
  "Extra mozzarella": 2.5,
  "Calabrian chili": 1.25,
  "Roasted mushrooms": 2.25,
  "Fresh basil": 0.75,
  "Gluten-free": 3,
  "Grilled chicken": 5,
  "Garlic shrimp": 7.5,
  "Italian sausage": 4.5,
  "Gluten-free penne": 2.5,
};

function orderTotals(lines: ReturnType<typeof storedLines>) {
  const subtotal = Math.round(lines.reduce((s, l) => s + l.unit_price * l.quantity, 0) * 100) / 100;
  const tax = Math.round(subtotal * TAX_RATE) / 100;
  return { subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
}

/* ------------------------------------------------------------- fixtures */

const GUESTS: Array<{ name: string; phone: string }> = [
  { name: "Daniel Ortiz", phone: "+15125550107" },
  { name: "Priya Raman", phone: "+15125550113" },
  { name: "Jake Whitfield", phone: "+15125550118" },
  { name: "Lucia Moreno", phone: "+15125550121" },
  { name: "Tom Becker", phone: "+15125550126" },
  { name: "Aisha Johnson", phone: "+15125550131" },
  { name: "Chris Nguyen", phone: "+15125550134" },
  { name: "Megan O'Hara", phone: "+15125550139" },
  { name: "Sam Patel", phone: "+15125550144" },
  { name: "Rosa Delgado", phone: "+15125550147" },
  { name: "Ben Carter", phone: "+15125550152" },
  { name: "Hannah Kim", phone: "+15125550158" },
  { name: "Luis Herrera", phone: "+15125550163" },
  { name: "Olivia Grant", phone: "+15125550167" },
  { name: "Marcus Lee", phone: "+15125550171" },
  { name: "Emily Shaw", phone: "+15125550176" },
];

const DELIVERY_ADDRESSES = [
  "2104 Holly St, Austin, TX 78702",
  "1817 E Cesar Chavez St, Austin, TX 78702",
  "905 Chicon St, Apt 3, Austin, TX 78702",
  "2311 Webberville Rd, Austin, TX 78702",
  "1203 Willow St, Austin, TX 78702",
];

const CARTS: Line[][] = [
  [{ name: "Margherita", quantity: 1, customizations: ["Extra mozzarella"] }, { name: "Garlic Knots", quantity: 1 }],
  [{ name: "Spaghetti Carbonara", quantity: 2 }, { name: "Caesar Salad", quantity: 1 }, { name: "Tiramisu", quantity: 1 }],
  [{ name: "Pepperoni", quantity: 2 }, { name: "Garlic Knots", quantity: 2 }, { name: "Italian Soda", quantity: 3 }],
  [{ name: "Chicken Parmigiana", quantity: 1 }, { name: "Cannoli", quantity: 1 }],
  [{ name: "Fettuccine Alfredo", quantity: 1, customizations: ["Grilled chicken"] }, { name: "Bruschetta al Pomodoro", quantity: 1 }],
  [{ name: "Quattro Formaggi", quantity: 1 }, { name: "Arugula & Pear", quantity: 1 }],
  [{ name: "Lasagna della Nonna", quantity: 2 }, { name: "Tiramisu", quantity: 2 }],
  [{ name: "Penne alla Vodka", quantity: 1, customizations: ["Italian sausage"] }, { name: "San Pellegrino", quantity: 1 }],
  [{ name: "Salsiccia & Peppers", quantity: 1 }, { name: "Margherita", quantity: 1 }, { name: "Garlic Knots", quantity: 1 }],
  [{ name: "Gnocchi al Pesto", quantity: 1 }, { name: "Caprese", quantity: 1 }],
  [{ name: "Linguine alle Vongole", quantity: 1 }, { name: "Panna Cotta", quantity: 1 }],
  [{ name: "Eggplant Parmigiana", quantity: 1 }, { name: "Caesar Salad", quantity: 1 }],
  [{ name: "Funghi", quantity: 1, customizations: ["Gluten-free"] }, { name: "Italian Soda", quantity: 1 }],
  [{ name: "Fried Calamari", quantity: 1 }, { name: "Pepperoni", quantity: 1 }, { name: "Cannoli", quantity: 2 }],
  [{ name: "Veal Marsala", quantity: 1 }, { name: "Burrata & Prosciutto", quantity: 1 }],
  [{ name: "Margherita", quantity: 3 }, { name: "Garlic Knots", quantity: 2 }],
  [{ name: "Spaghetti Carbonara", quantity: 1 }, { name: "Tiramisu", quantity: 1 }],
  [{ name: "Penne alla Vodka", quantity: 2, customizations: ["Gluten-free penne"] }],
  [{ name: "Chicken Parmigiana", quantity: 2 }, { name: "Caesar Salad", quantity: 2 }],
  [{ name: "Pepperoni", quantity: 1, customizations: ["Calabrian chili"] }, { name: "San Pellegrino", quantity: 2 }],
  [{ name: "Fettuccine Alfredo", quantity: 1, customizations: ["Garlic shrimp"] }, { name: "Panna Cotta", quantity: 1 }],
  [{ name: "Quattro Formaggi", quantity: 1 }, { name: "Garlic Knots", quantity: 1 }, { name: "Tiramisu", quantity: 1 }],
  [{ name: "Lasagna della Nonna", quantity: 1 }, { name: "Bruschetta al Pomodoro", quantity: 1 }],
];

type CallKind = "order" | "faq" | "reservation" | "voicemail" | "handoff" | "abandoned" | "active";

type PlannedCall = {
  kind: CallKind;
  startMs: number;
  durationSecs: number;
  guest: { name: string; phone: string };
  cart?: Line[];
  /** Order lifecycle for order calls. */
  orderStatus?: "new" | "in_progress" | "ready" | "completed";
  delivery?: string | null;
  faq?: { question: string; answer: string };
  handoff?: { flag: string; reason: string; summary: string };
  reservation?: { partySize: number; date: string; time: string; notes: string | null; status: string };
};

const FAQS = [
  { question: "Do you have gluten-free pasta?", answer: "Yes — gluten-free penne for any pasta for $2.50 more. Our kitchen isn't certified gluten-free." },
  { question: "Where can I park?", answer: "There's a free lot behind the building off Comal Street, plus street parking on East 6th." },
  { question: "How late are you open tonight?", answer: "We take the last orders 15 minutes before close — tonight that's 9:45." },
  { question: "Do you deliver to Mueller?", answer: "We deliver within about 4 miles — Mueller is right on the edge, so yes, with a $4.99 fee." },
];

const HANDOFFS = [
  {
    flag: "catering_requested",
    reason: "catering",
    summary: "Caller asked about catering a 35-person office lunch next Friday; wants a call back from the manager with a tray menu.",
  },
  {
    flag: "complaint_requested",
    reason: "complaint",
    summary: "Caller said last night's delivery arrived cold and was missing the garlic knots; asked for a manager to call back about a refund.",
  },
  {
    flag: "human_requested",
    reason: "human_requested",
    summary: "Caller wanted to speak to a real person about a gift card balance; host took a callback number.",
  },
];

function dateLabel(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date(ms));
}

function planCalls(now: number): PlannedCall[] {
  const rand = mulberry32(20261027);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]!;
  const calls: PlannedCall[] = [];

  // Historic calls spread over days 1..13 at plausible service hours (lunch + dinner).
  const slots: Array<{ day: number; hour: number; minute: number }> = [];
  for (let day = 13; day >= 1; day -= 1) {
    const perDay = day % 6 === 0 ? 2 : day % 2 === 0 ? 3 : 2;
    for (let i = 0; i < perDay; i += 1) {
      const dinner = rand() > 0.38;
      const hour = dinner ? 17 + Math.floor(rand() * 4) : 11 + Math.floor(rand() * 3);
      slots.push({ day, hour, minute: Math.floor(rand() * 60) });
    }
  }
  // Today (earlier in the service), relative to now.
  const todayOffsetsMin = [352, 292, 241, 188, 133, 104, 77];

  const kinds: CallKind[] = [
    // 22 completed historic orders + 7 faq/reservation + 4 voicemail + 3 handoff + 2 abandoned
    ...Array<CallKind>(22).fill("order"),
    "faq", "faq", "faq", "faq",
    "reservation", "reservation", "reservation",
    "voicemail", "voicemail", "voicemail", "voicemail",
    "handoff", "handoff", "handoff",
    "abandoned", "abandoned",
  ];
  // Deterministic shuffle so outcomes interleave across days.
  for (let i = kinds.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j]!, kinds[i]!];
  }

  const times = [
    ...slots.map((s) => austinTime(now, s.day, s.hour, s.minute)),
    ...todayOffsetsMin.map((m) => now - m * MIN - Math.floor(rand() * 9) * MIN),
  ]
    .filter((t) => t < now - 60 * MIN)
    .sort((a, b) => a - b);

  let cartIdx = 0;
  let faqIdx = 0;
  let handoffIdx = 0;
  let resIdx = 0;
  const reservations = [
    { partySize: 4, daysAhead: 1, time: "19:30", notes: "Birthday — would love a booth.", status: "requested" },
    { partySize: 6, daysAhead: 4, time: "18:45", notes: "One high chair please.", status: "contacted" },
    { partySize: 2, daysAhead: 2, time: "20:00", notes: null, status: "confirmed" },
  ];

  kinds.forEach((kind, i) => {
    const startMs = times[i % times.length]!;
    const guest = GUESTS[(i * 7 + 3) % GUESTS.length]!;
    if (kind === "order") {
      calls.push({
        kind,
        startMs,
        durationSecs: 118 + Math.floor(rand() * 170),
        guest,
        cart: CARTS[cartIdx++ % CARTS.length],
        orderStatus: "completed",
        delivery: rand() < 0.3 ? pick(DELIVERY_ADDRESSES) : null,
      });
    } else if (kind === "faq") {
      calls.push({ kind, startMs, durationSecs: 41 + Math.floor(rand() * 60), guest, faq: FAQS[faqIdx++ % FAQS.length] });
    } else if (kind === "reservation") {
      const r = reservations[resIdx++ % reservations.length]!;
      calls.push({
        kind,
        startMs,
        durationSecs: 74 + Math.floor(rand() * 50),
        guest,
        reservation: {
          partySize: r.partySize,
          date: dateLabel(now + r.daysAhead * DAY),
          time: r.time,
          notes: r.notes,
          status: r.status,
        },
      });
    } else if (kind === "voicemail") {
      calls.push({ kind, startMs, durationSecs: 19 + Math.floor(rand() * 25), guest });
    } else if (kind === "handoff") {
      calls.push({ kind, startMs, durationSecs: 96 + Math.floor(rand() * 80), guest, handoff: HANDOFFS[handoffIdx++ % HANDOFFS.length] });
    } else {
      calls.push({ kind, startMs, durationSecs: 33 + Math.floor(rand() * 40), guest, cart: CARTS[(cartIdx + 5) % CARTS.length]!.slice(0, 1) });
    }
  });

  // Happening now: a ticket that is ready, one being prepared, one just in, and a live call.
  calls.push(
    { kind: "order", startMs: now - 31 * MIN, durationSecs: 164, guest: GUESTS[4]!, cart: CARTS[15], orderStatus: "ready", delivery: null },
    { kind: "order", startMs: now - 17 * MIN, durationSecs: 203, guest: GUESTS[9]!, cart: CARTS[1], orderStatus: "in_progress", delivery: DELIVERY_ADDRESSES[2] },
    { kind: "order", startMs: now - 6 * MIN, durationSecs: 142, guest: GUESTS[12]!, cart: CARTS[8], orderStatus: "new", delivery: null },
    {
      kind: "active",
      startMs: now - 2 * MIN - 14_000,
      durationSecs: 0,
      guest: GUESTS[6]!,
      cart: [{ name: "Pepperoni", quantity: 1 }, { name: "Caesar Salad", quantity: 1 }],
    }
  );
  return calls;
}

function orderTranscript(call: PlannedCall, lines: ReturnType<typeof storedLines>) {
  const first = call.guest.name.split(" ")[0];
  const items = lines.map((l) => `${l.quantity > 1 ? `${l.quantity} ` : "a "}${l.name}${l.customizations.length ? ` with ${l.customizations.join(", ").toLowerCase()}` : ""}`);
  const { total } = orderTotals(lines);
  const mode = call.delivery ? `delivery to ${call.delivery.split(",")[0]}` : "pickup";
  return [
    { role: "agent", message: "Thanks for calling Maria's Trattoria, this is Sofia. Are you ordering for pickup or delivery?" },
    { role: "user", message: call.delivery ? "Delivery, please." : "Pickup." },
    { role: "agent", message: "Perfect. What can I get started for you?" },
    { role: "user", message: `Can I get ${items.join(" and ")}?` },
    { role: "agent", message: lines.some((l) => l.name.includes("Margherita") || l.name.includes("Pepperoni")) && !lines.some((l) => l.name === "Garlic Knots") ? "Got it. Would you like to add an order of garlic knots? Most guests do with a pizza." : "Got it. Anything else, maybe a tiramisu to finish?" },
    { role: "user", message: "No, that's everything." },
    { role: "agent", message: `Great. Can I get a name for the order?` },
    { role: "user", message: `${call.guest.name}.` },
    { role: "agent", message: `Thanks ${first}. That's $${total.toFixed(2)} with tax for ${mode}. It'll be ready in about ${call.delivery ? "45" : "20"} minutes.` },
    { role: "user", message: "Sounds good, thank you!" },
  ];
}


const ROAL_TOOLS = [
  "get_menu_items",
  "get_restaurant_info",
  "get_caller_history",
  "submit_reservation_request",
  "sync_draft_order",
  "finalize_order",
  "get_order_status",
];

/** Restaurant profile for the demo location (also re-applied by seed upgrades). */
function demoProfilePatch(organizationId: string, now: number): Row {
  const voice = TRIAL_VOICE_OPTIONS.find((v) => v.label === "Sarah") ?? TRIAL_VOICE_OPTIONS[0]!;
  const lastSync = iso(now - 2 * DAY - 3 * HOUR - 11 * MIN);
  const origin = getSiteOrigin() ?? "https://demo.getroal.example";
  return {
    organization_id: organizationId,
    phone: DEMO_PHONE,
    address_line1: "1407 E 6th St",
    address_line2: null,
    city: "Austin",
    region: "TX",
    postal_code: "78702",
    country: "US",
    timezone: "America/Chicago",
    cuisine: "Italian",
    website: "https://mariastrattoria.example",
    allows_pickup: true,
    allows_delivery: true,
    prep_time_minutes: 20,
    tax_rate_percent: TAX_RATE,
    service_fee_percent: 0,
    escalation_name: "Marco Rossi",
    escalation_phone: "+15125550199",
    escalation_email: "marco@mariastrattoria.example",
    handoff_catering_route: "Take name, headcount and date; Marco calls back within a day.",
    handoff_complaint_route: "Apologize, take a callback number, flag for the manager.",
    handoff_unavailable_item_behavior: "suggest_alternative",
    handoff_unavailable_item_notes: null,
    closed_hours_message: "We're closed right now — we open at 11am. You can leave a message and we'll call you back.",
    temporarily_closed: false,
    temporarily_closed_reason: null,
    agent_display_name: "Sofia",
    agent_voice_id: voice.id,
    agent_voice_label: voice.label,
    agent_greeting: "Thanks for calling Maria's Trattoria, this is Sofia. Are you ordering for pickup or delivery?",
    elevenlabs_agent_id: DEMO_AGENT_ID,
    elevenlabs_provision_status: "ready",
    elevenlabs_provision_error: null,
    elevenlabs_provisioned_at: iso(now - 16 * DAY - 4 * HOUR),
    elevenlabs_menu_auto_sync_status: "succeeded",
    elevenlabs_menu_auto_sync_error: null,
    elevenlabs_last_sync_at: lastSync,
    elevenlabs_last_sync_error: null,
    elevenlabs_last_sync_summary: {
      tools: ROAL_TOOLS.map((name) => ({ name, id: `tool_demo_${name}`, op: "updated" })),
      tool_ids_on_agent: ROAL_TOOLS.map((name) => `tool_demo_${name}`),
      restaurant_placeholders_updated: true,
      first_message_updated: true,
      restaurant_tools_baked: true,
      knowledge_base_doc_attached: true,
      phone_personalization_webhook: `${origin}${ELEVENLABS_CONVERSATION_INIT_PATH}`,
    },
    trial_scorecard: {},
    updated_at: lastSync,
  };
}

/* --------------------------------------------------------------- seeding */

async function findDemoOrg(db: Db): Promise<{ id: string; demo_seed_version?: number } | null> {
  const res = await db.from("organizations").select("id, demo_seed_version").eq("slug", DEMO_ORG_SLUG).maybeSingle();
  return must(res, "find org") as { id: string; demo_seed_version?: number } | null;
}

/** Bring an older demo workspace up to the current seed (non-destructive). */
async function upgradeDemoWorkspace(db: Db, organizationId: string, restaurantId: string, now: number) {
  must(
    await db.from("restaurant_profiles").update(demoProfilePatch(organizationId, now)).eq("restaurant_id", restaurantId),
    "upgrade profile"
  );
  must(
    await db.from("organizations").update({ demo_seed_version: DEMO_SEED_VERSION }).eq("id", organizationId),
    "upgrade version"
  );
}

async function ensureMembership(db: Db, organizationId: string, userId: string) {
  const existing = must(
    await db.from("memberships").select("id").eq("organization_id", organizationId).eq("user_id", userId),
    "membership read"
  ) as Row[];
  if (existing.length === 0) {
    must(
      await db.from("memberships").insert({ organization_id: organizationId, user_id: userId, role: "owner" }),
      "membership insert"
    );
  }
}

/** Drop the demo user's memberships that point at organizations that do not exist. */
async function pruneDanglingMemberships(db: Db, userId: string) {
  const rows = must(await db.from("memberships").select("id, organization_id").eq("user_id", userId), "memberships") as Row[];
  for (const row of rows) {
    const org = must(
      await db.from("organizations").select("id").eq("id", String(row.organization_id)).maybeSingle(),
      "org lookup"
    );
    if (!org) must(await db.from("memberships").delete().eq("id", String(row.id)), "prune membership");
  }
}

export async function seedDemoWorkspace(
  db: Db,
  options: { userId?: string; now?: number } = {}
): Promise<SeedDemoResult> {
  const userId = options.userId ?? DEMO_USER.id;
  const now = options.now ?? Date.now();

  must(
    await db
      .from("profiles")
      .upsert({ id: userId, display_name: DEMO_USER.user_metadata.full_name ?? "Maria Rossi" }, { onConflict: "id" }),
    "profile"
  );
  await pruneDanglingMemberships(db, userId);

  const existingOrg = await findDemoOrg(db);
  if (existingOrg) {
    await ensureMembership(db, existingOrg.id, userId);
    const r = must(
      await db.from("restaurants").select("id").eq("organization_id", existingOrg.id).limit(1),
      "restaurant read"
    ) as Row[];
    const restaurantId = r[0] ? String(r[0].id) : "";
    if (restaurantId && (existingOrg.demo_seed_version ?? 1) < DEMO_SEED_VERSION) {
      await upgradeDemoWorkspace(db, existingOrg.id, restaurantId, now);
    }
    if (restaurantId) await refreshLiveDemoRows(db, restaurantId, now);
    return { seeded: false, organizationId: existingOrg.id, restaurantId };
  }

  /* organization + owner */
  const org = must(
    await db
      .from("organizations")
      .insert({
        name: DEMO_ORG_NAME,
        slug: DEMO_ORG_SLUG,
        demo_seed_version: DEMO_SEED_VERSION,
        billing_plan: "growth",
        subscription_status: "trialing",
        trial_ends_at: iso(now + 9 * DAY + 5 * HOUR),
        created_at: iso(now - 17 * DAY),
        updated_at: iso(now - 17 * DAY),
      })
      .select("id")
      .single(),
    "org insert"
  ) as { id: string };
  const organizationId = org.id;
  await ensureMembership(db, organizationId, userId);
  must(
    await db
      .from("organization_onboarding")
      .update({
        steps: { account: { status: "completed", completed_at: iso(now - 17 * DAY) } },
        current_step: null,
        completed_at: iso(now - 17 * DAY),
        updated_at: iso(now - 17 * DAY),
      })
      .eq("organization_id", organizationId),
    "org onboarding"
  );

  /* restaurant + profile */
  const restaurant = must(
    await db
      .from("restaurants")
      .insert({ name: DEMO_RESTAURANT_NAME, organization_id: organizationId, created_at: iso(now - 17 * DAY) })
      .select("id")
      .single(),
    "restaurant insert"
  ) as { id: string };
  const restaurantId = restaurant.id;
  must(
    await db.from("restaurant_profiles").update(demoProfilePatch(organizationId, now)).eq("restaurant_id", restaurantId),
    "profile update"
  );

  /* weekly hours (0 = Sunday) */
  const hours: Record<number, [string, string]> = {
    0: ["11:00", "21:00"],
    1: ["11:00", "21:30"],
    2: ["11:00", "22:00"],
    3: ["11:00", "22:00"],
    4: ["11:00", "22:00"],
    5: ["11:00", "23:00"],
    6: ["11:00", "23:00"],
  };
  for (const [dow, [open, close]] of Object.entries(hours)) {
    must(
      await db
        .from("restaurant_weekly_hours")
        .upsert(
          { restaurant_id: restaurantId, day_of_week: Number(dow), is_closed: false, open_time: open, close_time: close },
          { onConflict: "restaurant_id,day_of_week" }
        ),
      "hours"
    );
  }
  const year = new Date(now).getUTCFullYear();
  const nov1 = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const thanksgivingDay = 1 + ((4 - nov1 + 7) % 7) + 21; // 4th Thursday of November
  must(
    await db.from("restaurant_hours_exceptions").insert({
      restaurant_id: restaurantId,
      exception_date: `${year}-11-${String(thanksgivingDay).padStart(2, "0")}`,
      label: "Thanksgiving",
      is_closed: true,
      open_time: null,
      close_time: null,
    }),
    "hours exception"
  );

  /* menu */
  const merged = await db.rpc("merge_menu", { p_restaurant_id: restaurantId, p_menu: demoMenuRpcPayload() });
  must(merged, "merge_menu");

  /* FAQ knowledge */
  const knowledge: Array<[string, string, string]> = [
    ["allergens", "Do you have gluten-free options?", "Gluten-free penne for any pasta (+$2.50) and a gluten-free pizza crust (+$3). Our kitchen is not certified gluten-free."],
    ["directions", "Where do I park?", "Free lot behind the building off Comal St, plus street parking on E 6th St."],
    ["policies", "Do you take reservations?", "Yes, for parties up to 8 by phone. Larger groups go through catering — we'll take details and Marco calls back."],
    ["policies", "Do you deliver?", "Within about 4 miles of E 6th St. $4.99 delivery fee, usually 45–60 minutes."],
    ["menu", "Is there a kids menu?", "Kids' spaghetti with butter or marinara, or a kids' cheese pizza — $8.50 each, under 12."],
    ["hours", "Are you open on holidays?", "Closed Thanksgiving and Christmas Day; otherwise regular hours."],
    ["general", "Can I bring my own wine?", "Yes — corkage is $15 per bottle, two bottles max per table."],
  ];
  must(
    await db.from("restaurant_knowledge_entries").insert(
      knowledge.map(([category, question, answer], i) => ({
        organization_id: organizationId,
        restaurant_id: restaurantId,
        category,
        question,
        answer,
        is_active: true,
        sort_order: i,
        created_at: iso(now - 15 * DAY + i * HOUR),
        updated_at: iso(now - 15 * DAY + i * HOUR),
      }))
    ),
    "knowledge"
  );

  /* upsell rules */
  must(
    await db.from("restaurant_upsell_rules").insert([
      {
        organization_id: organizationId,
        restaurant_id: restaurantId,
        trigger_text: "Any pizza order",
        offer_text: "Garlic Knots ($6.75) — most guests add a basket",
        is_active: true,
        sort_order: 0,
        created_at: iso(now - 14 * DAY - 2 * HOUR),
        updated_at: iso(now - 14 * DAY - 2 * HOUR),
      },
      {
        organization_id: organizationId,
        restaurant_id: restaurantId,
        trigger_text: "Pasta or secondi without dessert",
        offer_text: "Tiramisu ($9.25) to finish",
        is_active: true,
        sort_order: 1,
        created_at: iso(now - 14 * DAY - HOUR),
        updated_at: iso(now - 14 * DAY - HOUR),
      },
    ]),
    "upsell"
  );

  /* onboarding: everything done except go-live */
  const done = (daysAgo: number, metadata?: Record<string, unknown>) => ({
    status: "completed",
    completed_at: iso(now - daysAgo * DAY),
    ...(metadata ? { metadata } : {}),
  });
  must(
    await db
      .from("restaurant_onboarding")
      .update({
        steps: {
          restaurant_profile: done(17, { phone: DEMO_PHONE, timezone: "America/Chicago" }),
          menu_import: done(16.8, { menu_item_count: 26 }),
          voice_agent: done(16.2, { agent_id: DEMO_AGENT_ID, source: "demo_seed" }),
          test_call: done(15.9),
          go_live: { status: "pending" },
        },
        current_step: "go_live",
        updated_at: iso(now - 15.9 * DAY),
      })
      .eq("restaurant_id", restaurantId),
    "restaurant onboarding"
  );

  /* calls, orders, receipts, usage */
  const calls = planCalls(now);
  let seq = 0;
  for (const call of calls) {
    seq += 1;
    const sessionId = `${DEMO_SESSION_PREFIX}${String(seq).padStart(3, "0")}`;
    await insertCall(db, { call, sessionId, restaurantId, organizationId, now });
  }

  /* knowledge suggestions (pending review) */
  const suggestions: Array<[string, string, string | null, string, number]> = [
    ["do y'all have vegan cheese", "Do you have vegan cheese?", "Yes — vegan mozzarella on any pizza for $2.50.", "menu", 4],
    ["can i get a whole tiramisu for a party", "Can I order a whole tiramisu?", "Yes, a half-sheet tiramisu serves 12 for $58 with 24 hours' notice.", "menu", 2],
    ["is there outdoor seating", "Do you have outdoor seating?", "Yes, a covered patio with eight tables, first come first served.", "general", 3],
    ["can i bring my dog on the patio", "Is the patio dog friendly?", null, "policies", 1],
  ];
  must(
    await db.from("restaurant_knowledge_suggestions").insert(
      suggestions.map(([caller, question, answer, category, times], i) => ({
        organization_id: organizationId,
        restaurant_id: restaurantId,
        session_id: `${DEMO_SESSION_PREFIX}${String(3 + i * 7).padStart(3, "0")}`,
        caller_question: caller,
        suggested_question: question,
        suggested_answer: answer,
        category,
        status: "pending",
        times_asked: times,
        created_at: iso(now - (6 - i) * DAY - 5 * HOUR),
        updated_at: iso(now - (3 - i * 0.5) * DAY),
      }))
    ),
    "suggestions"
  );

  return { seeded: true, organizationId, restaurantId };
}

async function insertCall(
  db: Db,
  input: { call: PlannedCall; sessionId: string; restaurantId: string; organizationId: string; now: number }
) {
  const { call, sessionId, restaurantId, organizationId, now } = input;
  const startedAt = iso(call.startMs);
  const endedMs = call.startMs + call.durationSecs * 1000;
  const endedAt = call.kind === "active" ? null : iso(endedMs);
  const base = {
    restaurant_id: restaurantId,
    organization_id: organizationId,
    agent_id: DEMO_AGENT_ID,
    session_id: sessionId,
    conversation_id: sessionId,
    caller_phone: call.guest.phone,
    started_at: startedAt,
    ended_at: endedAt,
    created_at: startedAt,
    updated_at: endedAt ?? iso(now - 9_000),
  };
  const meta = (extra: Record<string, unknown>) => ({
    demo_seed: true,
    is_test_harness: false,
    called_number: DEMO_PHONE,
    resolved_via: "called_number",
    call_duration_secs: call.durationSecs,
    ...extra,
  });

  if (call.kind === "order" && call.cart) {
    const lines = storedLines(call.cart);
    const totals = orderTotals(lines);
    const status = call.orderStatus ?? "completed";
    const finalizedMs = endedMs + 4_000;
    const stamps: Record<string, string | null> = {
      accepted_at: null,
      in_progress_at: null,
      ready_at: null,
      completed_at: null,
      canceled_at: null,
    };
    let updatedMs = finalizedMs;
    if (status !== "new") {
      stamps.accepted_at = iso(finalizedMs + 70_000);
      stamps.in_progress_at = iso(finalizedMs + 2 * MIN + 10_000);
      updatedMs = finalizedMs + 2 * MIN + 10_000;
    }
    if (status === "ready" || status === "completed") {
      stamps.ready_at = iso(finalizedMs + 19 * MIN);
      updatedMs = finalizedMs + 19 * MIN;
    }
    if (status === "completed") {
      stamps.completed_at = iso(finalizedMs + (call.delivery ? 47 : 26) * MIN);
      updatedMs = finalizedMs + (call.delivery ? 47 : 26) * MIN;
    }
    const transcript = orderTranscript(call, lines);
    const summary = `${call.guest.name} ordered ${lines.map((l) => `${l.quantity}× ${l.name}`).join(", ")} for ${call.delivery ? "delivery" : "pickup"} — $${totals.total.toFixed(2)} with tax.`;

    must(
      await db.from("agent_call_events").insert({
        ...base,
        status: "ended",
        outcome: "order_completed",
        transcript_metadata: meta({
          transcript,
          transcript_summary: summary,
          customer_name: call.guest.name,
          order_total: totals.total,
          order_subtotal: totals.subtotal,
          termination_reason: "end_call tool",
        }),
      }),
      "call event (order)"
    );
    const fulfillment = call.delivery ? "delivery" : "pickup";
    must(
      await db.from("draft_orders").insert({
        restaurant_id: restaurantId,
        session_id: sessionId,
        status,
        items: lines,
        customer_name: call.guest.name,
        customer_phone: call.guest.phone,
        fulfillment_type: fulfillment,
        delivery_address: call.delivery ?? null,
        delivery_instructions: call.delivery ? "Ring the bell, please." : null,
        ...stamps,
        created_at: startedAt,
        updated_at: iso(Math.min(updatedMs, now - 30_000)),
      }),
      "draft order"
    );
    must(
      await db.from("phone_order_receipts").insert({
        restaurant_id: restaurantId,
        session_id: sessionId,
        items: lines,
        customer_name: call.guest.name,
        customer_phone: call.guest.phone,
        fulfillment_type: fulfillment,
        delivery_address: call.delivery ?? null,
        delivery_instructions: call.delivery ? "Ring the bell, please." : null,
        created_at: iso(finalizedMs),
      }),
      "receipt"
    );
    for (const eventType of ["voice_order", "order_completed"] as const) {
      must(
        await db.from("usage_events").insert({
          event_type: eventType,
          organization_id: organizationId,
          restaurant_id: restaurantId,
          user_id: null,
          session_id: sessionId,
          idempotency_key: `${eventType}:${restaurantId}:${sessionId}`,
          metadata: { demo_seed: true, line_count: lines.length, order_total: totals.total },
          occurred_at: iso(finalizedMs),
        }),
        "usage"
      );
    }
    return;
  }

  if (call.kind === "active") {
    must(
      await db.from("agent_call_events").insert({
        ...base,
        status: "active",
        outcome: "in_progress",
        transcript_metadata: meta({ event_type: "conversation_init", init_received_at: startedAt }),
      }),
      "call event (active)"
    );
    must(
      await db.from("draft_orders").insert({
        restaurant_id: restaurantId,
        session_id: sessionId,
        status: "draft",
        items: storedLines(call.cart ?? []),
        customer_name: null,
        customer_phone: call.guest.phone,
        fulfillment_type: "pickup",
        created_at: startedAt,
        updated_at: iso(now - 9_000),
      }),
      "live cart"
    );
    return;
  }

  const first = call.guest.name.split(" ")[0];
  if (call.kind === "faq" && call.faq) {
    must(
      await db.from("agent_call_events").insert({
        ...base,
        status: "ended",
        outcome: "no_order",
        transcript_metadata: meta({
          call_intent: "question",
          transcript: [
            { role: "agent", message: "Thanks for calling Maria's Trattoria, this is Sofia. How can I help?" },
            { role: "user", message: call.faq.question },
            { role: "agent", message: call.faq.answer },
            { role: "user", message: "Perfect, thanks!" },
          ],
          transcript_summary: `Caller asked: "${call.faq.question}" Sofia answered from the FAQ; no order placed.`,
        }),
      }),
      "call event (faq)"
    );
    return;
  }

  if (call.kind === "reservation" && call.reservation) {
    const r = call.reservation;
    must(
      await db.from("agent_call_events").insert({
        ...base,
        status: "ended",
        outcome: "no_order",
        transcript_metadata: meta({
          call_intent: "reservation",
          transcript: [
            { role: "agent", message: "Thanks for calling Maria's Trattoria, this is Sofia. How can I help?" },
            { role: "user", message: `I'd like a table for ${r.partySize} on ${r.date} around ${r.time}.` },
            { role: "agent", message: `I've put in a request for ${r.partySize} at ${r.time}. The team will text you to confirm. Can I get your name?` },
            { role: "user", message: `${call.guest.name}.` },
            { role: "agent", message: `Thanks ${first}, you'll hear from us shortly.` },
          ],
          transcript_summary: `Reservation request: party of ${r.partySize} on ${r.date} at ${r.time} for ${call.guest.name}.`,
        }),
      }),
      "call event (reservation)"
    );
    must(
      await db.from("restaurant_reservation_requests").insert({
        organization_id: organizationId,
        restaurant_id: restaurantId,
        session_id: sessionId,
        conversation_id: sessionId,
        customer_name: call.guest.name,
        customer_phone: call.guest.phone,
        party_size: r.partySize,
        requested_date: r.date,
        requested_time: r.time,
        notes: r.notes,
        status: r.status,
        created_at: endedAt,
        updated_at: endedAt,
      }),
      "reservation"
    );
    return;
  }

  if (call.kind === "voicemail") {
    must(
      await db.from("agent_call_events").insert({
        ...base,
        status: "ended",
        outcome: "no_order",
        transcript_metadata: meta({
          voicemail_detected: true,
          callback_phone: call.guest.phone,
          follow_up_reason: "voicemail",
          transcript: [
            { role: "agent", message: "Thanks for calling Maria's Trattoria, this is Sofia." },
            { role: "user", message: `Hi, this is ${first}, calling about an order from earlier — give me a call back when you can.` },
          ],
          transcript_summary: `Voicemail from ${call.guest.name} asking for a call back.`,
        }),
      }),
      "call event (voicemail)"
    );
    return;
  }

  if (call.kind === "handoff" && call.handoff) {
    must(
      await db.from("agent_call_events").insert({
        ...base,
        status: "ended",
        outcome: "no_order",
        transcript_metadata: meta({
          [call.handoff.flag]: true,
          handoff_requested: true,
          handoff_reason: call.handoff.reason,
          callback_phone: call.guest.phone,
          transcript: [
            { role: "agent", message: "Thanks for calling Maria's Trattoria, this is Sofia. How can I help?" },
            { role: "user", message: call.handoff.summary.replace(/^Caller /, "Hi — I ").replace(/; .*/, ".") },
            { role: "agent", message: "I'm sorry about that — let me get Marco, our manager, to call you back. Is this the best number?" },
            { role: "user", message: "Yes, this number works." },
          ],
          transcript_summary: call.handoff.summary,
        }),
      }),
      "call event (handoff)"
    );
    return;
  }

  // abandoned: caller hung up mid-order
  must(
    await db.from("agent_call_events").insert({
      ...base,
      status: "ended",
      outcome: "abandoned",
      transcript_metadata: meta({
        transcript: [
          { role: "agent", message: "Thanks for calling Maria's Trattoria, this is Sofia. Pickup or delivery?" },
          { role: "user", message: "Pickup — can I get a..." },
        ],
        transcript_summary: "Caller started a pickup order and disconnected before confirming.",
        termination_reason: "client disconnected",
      }),
    }),
    "call event (abandoned)"
  );
}

/**
 * Keep the "happening now" rows believable on later demo sign-ins: if the live call
 * started more than 30 minutes ago, shift it and the open tickets back to recent times.
 */
export async function refreshLiveDemoRows(db: Db, restaurantId: string, now = Date.now()): Promise<boolean> {
  const active = must(
    await db.from("agent_call_events").select("*").eq("restaurant_id", restaurantId).eq("status", "active"),
    "active calls"
  ) as Row[];
  const demoActive = active.filter((r) => String(r.session_id).startsWith(DEMO_SESSION_PREFIX));
  const stale = demoActive.some((r) => now - new Date(String(r.started_at)).getTime() > 30 * MIN);
  if (demoActive.length === 0 || !stale) return false;

  for (const row of demoActive) {
    const startedAt = iso(now - 2 * MIN - 14_000);
    must(
      await db
        .from("agent_call_events")
        .update({ started_at: startedAt, created_at: startedAt, updated_at: iso(now - 9_000) })
        .eq("restaurant_id", restaurantId)
        .eq("session_id", String(row.session_id)),
      "refresh active"
    );
  }

  const open = must(
    await db.from("draft_orders").select("*").eq("restaurant_id", restaurantId).in("status", ["draft", "new", "accepted", "in_progress", "ready"]),
    "open tickets"
  ) as Row[];
  const minutesAgo: Record<string, number> = { draft: 2, new: 6, accepted: 12, in_progress: 17, ready: 31 };
  for (const row of open) {
    if (!String(row.session_id).startsWith(DEMO_SESSION_PREFIX)) continue;
    const startMs = now - (minutesAgo[String(row.status)] ?? 10) * MIN;
    const patch: Row = { created_at: iso(startMs), updated_at: iso(Math.min(startMs + 3 * MIN, now - 30_000)) };
    if (row.accepted_at) patch.accepted_at = iso(startMs + 3 * MIN);
    if (row.in_progress_at) patch.in_progress_at = iso(startMs + 4 * MIN);
    if (row.ready_at) patch.ready_at = iso(Math.min(startMs + 21 * MIN, now - 60_000));
    must(await db.from("draft_orders").update(patch).eq("id", String(row.id)).eq("restaurant_id", restaurantId), "refresh ticket");
  }
  return true;
}
