#!/usr/bin/env node
/**
 * Prompt 31 — direct Edge QA for finalize-order (and sync-draft-order prelude).
 * Usage: node --env-file=.env --env-file=.env.local scripts/qa-finalize-order-edge.mjs
 */
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const RESTAURANT_ID = process.env.QA_RESTAURANT_ID?.trim() || "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
const BASE =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ||
  "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
const LEGACY = process.env.AGENT_TOOL_SECRET?.trim() || "";
const SIGNING =
  process.env.AGENT_TOOL_SIGNING_SECRET?.trim() || LEGACY;

if (!BASE || !ANON) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
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
  return {
    status: res.status,
    replay: res.headers.get("x-roal-idempotent-replay"),
    json,
  };
}

const runId = `qa-p31-${Date.now()}`;
const sessionDraft = `${runId}-draft`;
const sessionDirect = `${runId}-direct`;
const sessionBad = `${runId}-bad`;

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name}: ${detail}`);
}

async function main() {
  const menuRes = await callEdge(
    "get-menu",
    { restaurant_id: RESTAURANT_ID },
    { method: "GET" }
  );
  if (menuRes.status !== 200) {
    record("get-menu", false, `HTTP ${menuRes.status}`);
    summarize();
    process.exit(1);
  }
  const item =
    menuRes.json?.categories?.flatMap((c) => c.items ?? [])?.find((i) => i.is_available) ??
    null;
  if (!item?.name) {
    record("get-menu item", false, "no available item");
    summarize();
    process.exit(1);
  }
  record("get-menu", true, `picked "${item.name}"`);

  const syncRes = await callEdge("sync-draft-order", {
    restaurant_id: RESTAURANT_ID,
    session_id: sessionDraft,
    status: "draft",
    items: [{ name: item.name, quantity: 1 }],
  });
  record(
    "sync-draft-order",
    syncRes.status === 200,
    `HTTP ${syncRes.status} status=${syncRes.json?.draft_order?.status ?? "?"}`
  );

  const idemKey = `qa-p31-finalize-${runId}`;
  const finalizeBody = {
    restaurant_id: RESTAURANT_ID,
    session_id: sessionDraft,
    customer_name: "QA Flow Guest",
    customer_phone: "4155550199",
  };

  const fin1 = await callEdge("finalize-order", finalizeBody, { idempotencyKey: idemKey });
  const status1 = fin1.json?.draft_order?.status;
  record(
    "finalize-order (after sync)",
    fin1.status === 200 && status1 === "new",
    `HTTP ${fin1.status} draft_status=${status1} replay=${fin1.replay ?? "—"}`
  );

  const fin2 = await callEdge("finalize-order", finalizeBody, { idempotencyKey: idemKey });
  record(
    "idempotency replay",
    fin2.status === 200 && fin2.replay === "true",
    `HTTP ${fin2.status} x-roal-idempotent-replay=${fin2.replay ?? "missing"}`
  );

  const finDirect = await callEdge("finalize-order", {
    restaurant_id: RESTAURANT_ID,
    session_id: sessionDirect,
    customer_name: "QA Direct Cart",
    customer_phone: "6285550142",
    items: [{ name: item.name, quantity: 2 }],
  });
  record(
    "finalize-order (standalone items)",
    finDirect.status === 200 && finDirect.json?.draft_order?.status === "new",
    `HTTP ${finDirect.status}`
  );

  const zodMissing = await callEdge("finalize-order", {
    restaurant_id: RESTAURANT_ID,
    session_id: sessionBad,
    customer_name: "",
    customer_phone: "",
  });
  record(
    "missing name/phone (Zod)",
    zodMissing.status === 400 &&
      zodMissing.json?.code === "validation_failed",
    `HTTP ${zodMissing.status} code=${zodMissing.json?.code}`
  );

  const placeholder = await callEdge("finalize-order", {
    restaurant_id: RESTAURANT_ID,
    session_id: `${sessionBad}-ph`,
    customer_name: "John Doe",
    customer_phone: "555-000-0000",
    items: [{ name: item.name, quantity: 1 }],
  });
  record(
    "placeholder customer (business rules)",
    placeholder.status === 400 &&
      placeholder.json?.code === "customer_validation_failed",
    `HTTP ${placeholder.status} code=${placeholder.json?.code}`
  );

  console.log("\n--- DB verify hints (run via MCP) ---");
  console.log(
    JSON.stringify(
      {
        restaurant_id: RESTAURANT_ID,
        sessions: [sessionDraft, sessionDirect],
        idempotency_key: idemKey,
        run_id: runId,
      },
      null,
      2
    )
  );

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
