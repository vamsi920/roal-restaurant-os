/**
 * Prompt 20 — ensure AGENT_TOOL_SIGNING_SECRET parity (Next.js + Supabase Edge).
 * Generates a dedicated signing secret if missing locally, mirrors to Edge, optional re-sync.
 *
 * Usage:
 *   npx tsx --env-file=.env --env-file=.env.local scripts/ensure-agent-tool-signing-parity.ts
 *   npx tsx ... scripts/ensure-agent-tool-signing-parity.ts --skip-resync
 */
import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SKIP_RESYNC = process.argv.includes("--skip-resync");
const ENV_LOCAL = resolve(process.cwd(), ".env.local");

function edgeHasSigningSecret(): boolean {
  try {
    const out = execSync("supabase secrets list", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return /\bAGENT_TOOL_SIGNING_SECRET\b/.test(out);
  } catch {
    return false;
  }
}

function ensureLocalSigningSecret(): { created: boolean; present: boolean } {
  const current = process.env.AGENT_TOOL_SIGNING_SECRET?.trim();
  if (current) return { created: false, present: true };

  const value = randomBytes(32).toString("hex");
  let text = existsSync(ENV_LOCAL) ? readFileSync(ENV_LOCAL, "utf8") : "";

  if (/^AGENT_TOOL_SIGNING_SECRET=/m.test(text)) {
    return { created: false, present: false };
  }

  text += `${text.endsWith("\n") || text.length === 0 ? "" : "\n"}AGENT_TOOL_SIGNING_SECRET=${value}\n`;
  writeFileSync(ENV_LOCAL, text, "utf8");
  process.env.AGENT_TOOL_SIGNING_SECRET = value;
  return { created: true, present: true };
}

function pushSigningSecretToEdge(): void {
  const secret = process.env.AGENT_TOOL_SIGNING_SECRET?.trim();
  if (!secret) throw new Error("AGENT_TOOL_SIGNING_SECRET missing after local ensure");

  try {
    execSync(`supabase secrets set AGENT_TOOL_SIGNING_SECRET=${JSON.stringify(secret)}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (e) {
    const err = e as { stderr?: string; message?: string };
    throw new Error(
      err.stderr?.trim() || err.message || "supabase secrets set failed"
    );
  }
}

void (async () => {
  const checks: { name: string; ok: boolean; detail?: string }[] = [];

  const legacyPresent = Boolean(process.env.AGENT_TOOL_SECRET?.trim());
  checks.push({
    name: "local AGENT_TOOL_SECRET (legacy fallback)",
    ok: legacyPresent,
    detail: legacyPresent ? "set" : "missing",
  });

  const localBefore = Boolean(process.env.AGENT_TOOL_SIGNING_SECRET?.trim());
  const localEnsure = ensureLocalSigningSecret();
  checks.push({
    name: "local AGENT_TOOL_SIGNING_SECRET",
    ok: localEnsure.present || localBefore,
    detail: localEnsure.created
      ? "generated and written to .env.local"
      : localBefore
        ? "already set"
        : localEnsure.present
          ? "set"
          : "missing — add manually",
  });

  const edgeBefore = edgeHasSigningSecret();
  if (!edgeBefore && (localEnsure.present || process.env.AGENT_TOOL_SIGNING_SECRET?.trim())) {
    pushSigningSecretToEdge();
  }
  const edgeAfter = edgeHasSigningSecret();
  checks.push({
    name: "Edge AGENT_TOOL_SIGNING_SECRET",
    ok: edgeAfter,
    detail: edgeAfter
      ? edgeBefore
        ? "already set"
        : "set via supabase secrets"
      : "missing — run supabase login + link",
  });

  if (!SKIP_RESYNC && edgeAfter && (localEnsure.created || !edgeBefore)) {
    console.log("Re-syncing ElevenLabs agents (signing secret changed)…");
    execSync("npm run resync:elevenlabs-all", {
      stdio: "inherit",
      env: process.env,
    });
    checks.push({
      name: "ElevenLabs agent re-sync after signing parity",
      ok: true,
      detail: "completed",
    });
  } else if (!SKIP_RESYNC && localEnsure.created && !edgeAfter) {
    checks.push({
      name: "ElevenLabs agent re-sync after signing parity",
      ok: false,
      detail: "skipped — Edge secret not confirmed",
    });
  }

  let pass = 0;
  for (const c of checks) {
    if (c.ok) pass += 1;
    console.log(`[${c.ok ? "PASS" : "FAIL"}] ${c.name}${c.detail ? `: ${c.detail}` : ""}`);
  }

  console.log(`\n${pass}/${checks.length} parity checks passed`);
  if (!edgeAfter || !(localEnsure.present || localBefore)) process.exit(1);
})().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
