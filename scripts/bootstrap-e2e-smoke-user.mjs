/**
 * Ephemeral QA user for local e2e-smoke (never commit credentials).
 * Usage: node --env-file=.env --env-file=.env.local scripts/bootstrap-e2e-smoke-user.mjs [baseUrl]
 */
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

const base = process.argv[2] ?? process.env.E2E_BASE_URL ?? "http://localhost:3020";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const email = `e2e-smoke-${Date.now()}@example.com`;
const password = `RoalE2e${randomUUID().slice(0, 12)}a1`;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (createErr || !created.user) {
  console.error("createUser failed:", createErr?.message ?? "no user");
  process.exit(1);
}

const userId = created.user.id;
const orgSlug = `e2e-${Date.now()}`;
const { data: org, error: orgErr } = await admin
  .from("organizations")
  .insert({ name: "E2E Smoke Org", slug: orgSlug })
  .select("id")
  .single();

if (orgErr || !org) {
  console.error("org insert failed:", orgErr?.message ?? "no org");
  process.exit(1);
}

const { error: memberErr } = await admin.from("memberships").insert({
  organization_id: org.id,
  user_id: userId,
  role: "owner",
});

if (memberErr) {
  console.error("membership insert failed:", memberErr.message);
  process.exit(1);
}

const { error: profileErr } = await admin.from("profiles").upsert({
  id: userId,
  display_name: "E2E Smoke",
});

if (profileErr && !/duplicate key/i.test(profileErr.message)) {
  console.error("profile upsert failed:", profileErr.message);
  process.exit(1);
}

const { data: restaurant, error: restErr } = await admin
  .from("restaurants")
  .insert({ name: "E2E Smoke Restaurant", organization_id: org.id })
  .select("id")
  .single();

if (restErr || !restaurant) {
  console.error("restaurant insert failed:", restErr?.message ?? "no restaurant");
  process.exit(1);
}

console.log("Ephemeral E2E user bootstrapped (credentials not logged). Running e2e-smoke…");

const run = spawnSync("node", ["scripts/e2e-smoke.mjs", base], {
  cwd: REPO,
  env: {
    ...process.env,
    E2E_BASE_URL: base,
    E2E_EMAIL: email,
    E2E_PASSWORD: password,
    E2E_RESTAURANT_ID: restaurant.id,
  },
  stdio: "inherit",
});

process.exit(run.status ?? 1);
