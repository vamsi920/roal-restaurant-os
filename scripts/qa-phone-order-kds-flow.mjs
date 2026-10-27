#!/usr/bin/env node
/**
 * Prompt 14 — phone order → KDS visibility via /api/agent-tools (sync-draft-order,
 * finalize-order, get-order-status) against a running app (local `npm run dev` or deployed).
 * Usage: node --env-file=.env --env-file=.env.local scripts/qa-phone-order-kds-flow.mjs
 */
import { createHmac, randomUUID } from "node:crypto";

const RESTAURANT_ID =
  process.env.QA_RESTAURANT_ID?.trim() || "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
const BASE = (
  process.env.ROAL_AGENT_TOOLS_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3000"
).replace(/\/+$/, "");
const LEGACY = process.env.AGENT_TOOL_SECRET?.trim() || "";
const SIGNING = process.env.AGENT_TOOL_SIGNING_SECRET?.trim() || LEGACY;

if (!SIGNING) {
  console.error("Missing AGENT_TOOL_SIGNING_SECRET (or AGENT_TOOL_SECRET)");
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
    Authorization: `Bearer ${mintToken(RESTAURANT_ID)}`,
    "x-roal-restaurant-id": RESTAURANT_ID,
  };
  if (idempotencyKey) h["x-roal-idempotency-key"] = idempotencyKey;
  return h;
}

async function callTool(slug, body, { idempotencyKey, method = "POST" } = {}) {
  const url =
    method === "GET" && body?.restaurant_id
      ? `${BASE}/api/agent-tools/${slug}?restaurant_id=${encodeURIComponent(body.restaurant_id)}`
      : `${BASE}/api/agent-tools/${slug}`;
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

/** Order status as the kitchen sees it, read back through get-order-status. */
async function loadDraftBySession(sessionId) {
  const res = await callTool("get-order-status", {
    restaurant_id: RESTAURANT_ID,
    session_id: sessionId,
  });
  if (res.status !== 200) return { error: `HTTP ${res.status}` };
  const order = res.json?.order ?? res.json?.draft_order ?? res.json ?? null;
  return { row: order && typeof order.status === "string" ? order : null };
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
  const menuRes = await callTool(
    "get-menu",
    { restaurant_id: RESTAURANT_ID },
    { method: "GET" }
  );
  if (menuRes.status === 200 && menuRes.json?.operations?.ordering_allowed === false) {
    record("get-menu", false, "ordering is closed — open hours for the QA restaurant first");
    summarize();
    process.exit(1);
  }
  const item =
    menuRes.json?.categories?.flatMap((c) => c.items ?? [])?.find((i) => i.is_available) ??
    null;
  if (menuRes.status !== 200 || !item?.name) {
    record("get-menu", false, `HTTP ${menuRes.status}`);
    summarize();
    process.exit(1);
  }
  record("get-menu", true, `"${item.name}"`);

  const sync1 = await callTool("sync-draft-order", {
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

  const sync2 = await callTool("sync-draft-order", {
    restaurant_id: RESTAURANT_ID,
    session_id: sessionId,
    status: "draft",
    items: [{ name: item.name, quantity: 2 }],
  });
  db = await loadDraftBySession(sessionId);
  const qty =
    sync2.json?.draft_order?.items?.[0]?.quantity ?? db.row?.items?.[0]?.quantity;
  record(
    "sync draft (update qty)",
    sync2.status === 200 && db.row?.status === "draft" && qty === 2,
    `HTTP ${sync2.status} qty=${qty ?? "?"}`
  );

  const fin = await callTool("finalize-order", {
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

  console.log("\n--- session (for dashboard spot-check) ---");
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
