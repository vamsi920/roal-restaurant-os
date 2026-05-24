#!/usr/bin/env node
/**
 * Prompt 14 — phone order → KDS visibility (Edge sync/update/finalize + DB bucket check).
 * Usage: node --env-file=.env --env-file=.env.local scripts/qa-phone-order-kds-flow.mjs
 */
import { createHmac, randomUUID } from "node:crypto";

const RESTAURANT_ID =
  process.env.QA_RESTAURANT_ID?.trim() || "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const LEGACY = process.env.AGENT_TOOL_SECRET?.trim() || "";
const SIGNING = process.env.AGENT_TOOL_SIGNING_SECRET?.trim() || LEGACY;

if (!BASE || !ANON || !SERVICE) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const PREFIX = "roal1";
function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
function mintToken(rid) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { v: 1, rid, iat: now, exp: now + 3600, jti: randomUUID() };
  const payload = b64url(JSON.stringify(claims));
  const sig = b64url(
    createHmac("sha256", SIGNING).update(`${PREFIX}.${payload}`).digest()
  );
  return `${PREFIX}.${payload}.${sig}`;
}

function authHeaders(idempotencyKey) {
  const h = {
    "Content-Type": "application/json",
    apikey: ANON,
    Authorization: `Bearer ${mintToken(RESTAURANT_ID)}`,
    "x-roal-restaurant-id": RESTAURANT_ID,
  };
  if (idempotencyKey) h["x-roal-idempotency-key"] = idempotencyKey;
  return h;
}

async function callEdge(slug, body, { idempotencyKey, method = "POST" } = {}) {
  const url =
    method === "GET" && body?.restaurant_id
      ? `${BASE}/functions/v1/${slug}?restaurant_id=${encodeURIComponent(body.restaurant_id)}`
      : `${BASE}/functions/v1/${slug}`;
  const res = await fetch(url, {
    method,
    headers: authHeaders(idempotencyKey),
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, json };
}

async function loadDraftBySession(sessionId) {
  const url = `${BASE}/rest/v1/draft_orders?restaurant_id=eq.${RESTAURANT_ID}&session_id=eq.${encodeURIComponent(sessionId)}&select=id,status,items,updated_at,session_id&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
    },
  });
  if (!res.ok) {
    return { error: `HTTP ${res.status}` };
  }
  const rows = await res.json();
  return { row: Array.isArray(rows) ? rows[0] ?? null : null };
}

/** Mirrors LiveOrdersPanel tab bucketing. */
function kdsTabForStatus(status) {
  if (status === "draft") return "live";
  if (status === "new" || status === "accepted" || status === "in_progress" || status === "ready") {
    return "queue";
  }
  if (status === "completed" || status === "canceled") return "done";
  return "unknown";
}

const runId = `qa-p14-${Date.now()}`;
const sessionId = `${runId}-flow`;
const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}: ${detail}`);
}

async function main() {
  const menuRes = await callEdge(
    "get-menu",
    { restaurant_id: RESTAURANT_ID },
    { method: "GET" }
  );
  const item =
    menuRes.json?.categories?.flatMap((c) => c.items ?? [])?.find((i) => i.is_available) ??
    null;
  if (menuRes.status !== 200 || !item?.name) {
    record("get-menu", false, `HTTP ${menuRes.status}`);
    summarize();
    process.exit(1);
  }
  record("get-menu", true, `"${item.name}"`);

  const sync1 = await callEdge("sync-draft-order", {
    restaurant_id: RESTAURANT_ID,
    session_id: sessionId,
    status: "draft",
    items: [{ name: item.name, quantity: 1 }],
  });
  record(
    "sync draft (create)",
    sync1.status === 200 && sync1.json?.draft_order?.status === "draft",
    `HTTP ${sync1.status}`
  );

  let db = await loadDraftBySession(sessionId);
  record(
    "KDS live tab after create",
    db.row?.status === "draft" && kdsTabForStatus(db.row.status) === "live",
    db.row ? `status=${db.row.status} tab=live` : db.error ?? "no row"
  );

  const sync2 = await callEdge("sync-draft-order", {
    restaurant_id: RESTAURANT_ID,
    session_id: sessionId,
    status: "draft",
    items: [{ name: item.name, quantity: 2 }],
  });
  db = await loadDraftBySession(sessionId);
  const qty = db.row?.items?.[0]?.quantity;
  record(
    "sync draft (update qty)",
    sync2.status === 200 && db.row?.status === "draft" && qty === 2,
    `HTTP ${sync2.status} qty=${qty ?? "?"}`
  );

  const fin = await callEdge("finalize-order", {
    restaurant_id: RESTAURANT_ID,
    session_id: sessionId,
    customer_name: "KDS Flow Guest",
    customer_phone: "4155550133",
  });
  db = await loadDraftBySession(sessionId);
  record(
    "finalize → kitchen queue",
    fin.status === 200 &&
      db.row?.status === "new" &&
      kdsTabForStatus(db.row.status) === "queue",
    `HTTP ${fin.status} status=${db.row?.status ?? "?"} tab=queue`
  );

  console.log("\n--- session (for MCP / dashboard spot-check) ---");
  console.log(JSON.stringify({ restaurant_id: RESTAURANT_ID, session_id: sessionId, run_id: runId }, null, 2));

  summarize();
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}

function summarize() {
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
