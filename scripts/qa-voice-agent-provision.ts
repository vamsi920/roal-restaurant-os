/**
 * ROAL pass 24 — dedicated ElevenLabs agent provisioning QA.
 *
 * Creates or uses a test restaurant, provisions a dedicated agent (when missing or forced),
 * verifies agent id + baked tools on the restaurant, and confirms prompt/first message on ElevenLabs.
 *
 * Usage:
 *   npx tsx --env-file=.env --env-file=.env.local scripts/qa-voice-agent-provision.ts
 *   QA_RESTAURANT_ID=<uuid> npx tsx --env-file=.env --env-file=.env.local scripts/qa-voice-agent-provision.ts
 *   QA_CREATE_RESTAURANT=1 QA_ORG_ID=<uuid> QA_USER_ID=<uuid> npx tsx ...
 *   QA_FORCE_PROVISION=1  # clone a new dedicated agent even when one exists
 *
 * Requires: ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID (template), FIREBASE_SERVICE_ACCOUNT (Firestore),
 * ROAL edge tool secrets, QA_USER_ID (for provision audit).
 */
import { firstMessageHasUnresolvedTemplates } from "../lib/elevenlabs-placeholders";
import { getElevenLabsAgentId } from "../lib/env.server";
import {
  defaultProvisionRestaurantVoiceAgentDeps,
  provisionRestaurantVoiceAgent,
} from "../lib/voice-agent/provision-restaurant-voice-agent";
import { resolveDedicatedElevenLabsAgentId } from "../lib/voice-agent/dedicated-agent-id";
import {
  checksFromSyncSummary,
  loadProfileVoiceState,
  printQaChecks,
  readAgentMenuSnapshot,
  redactSecrets,
  requireServiceRoleSupabase,
  resolveQaRestaurant,
  resolveQaUserId,
  verifyBakedToolsForRestaurant,
  type QaCheck,
} from "../lib/voice-agent/qa/live-helpers";

void (async () => {
  const sb = requireServiceRoleSupabase();
  const ctx = await resolveQaRestaurant(sb);
  const userId = resolveQaUserId();
  const forceProvision = process.env.QA_FORCE_PROVISION === "1";

  const checks: QaCheck[] = [];
  let agentId: string | null = null;

  const before = await loadProfileVoiceState(sb, ctx.restaurantId);
  const templateId = getElevenLabsAgentId();
  const dedicatedId = resolveDedicatedElevenLabsAgentId(
    before?.elevenlabs_agent_id,
    templateId
  );
  const hadAgent =
    Boolean(dedicatedId) &&
    before?.elevenlabs_provision_status === "ready" &&
    !forceProvision;

  if (!hadAgent || forceProvision) {
    console.log(
      forceProvision && dedicatedId
        ? "QA_FORCE_PROVISION=1 — provisioning dedicated agent"
        : dedicatedId
          ? "Re-syncing dedicated agent (provision not ready)…"
          : "Provisioning dedicated voice agent…"
    );
    const result = await provisionRestaurantVoiceAgent(
      ctx.restaurantId,
      ctx.restaurantName,
      ctx.organizationId,
      userId,
      {
        ...defaultProvisionRestaurantVoiceAgentDeps(),
        getSupabase: async () => sb,
      },
      { forceReprovision: forceProvision }
    );

    checks.push({
      name: "provision: succeeded",
      ok: result.ok === true,
      detail: result.ok ? undefined : result.error,
    });

    if (!result.ok) {
      printQaChecks(checks);
      process.exit(1);
    }

    agentId = result.agentId;
    checks.push(...checksFromSyncSummary(result.summary, "provision"));
    checks.push({
      name: "provision: method recorded",
      ok: Boolean(result.summary.provision?.method),
      detail: result.summary.provision?.method,
    });
  } else {
    agentId = dedicatedId!;
    console.log(`Using existing dedicated agent ${agentId}`);
    checks.push({
      name: "provision: skipped (agent already linked)",
      ok: true,
      detail: "set QA_FORCE_PROVISION=1 to re-clone",
    });
  }

  const after = await loadProfileVoiceState(sb, ctx.restaurantId);
  checks.push({
    name: "profile: elevenlabs_agent_id saved",
    ok: after?.elevenlabs_agent_id === agentId,
  });
  checks.push({
    name: "profile: provision_status ready",
    ok: after?.elevenlabs_provision_status === "ready",
    detail: String(after?.elevenlabs_provision_status ?? "null"),
  });
  checks.push({
    name: "profile: provision_error cleared",
    ok: after?.elevenlabs_provision_error == null,
  });
  checks.push({
    name: "profile: provisioned_at set",
    ok: Boolean(after?.elevenlabs_provisioned_at),
  });
  checks.push(
    ...checksFromSyncSummary(
      after?.elevenlabs_last_sync_summary as Record<string, unknown> | null,
      "profile last_sync_summary"
    )
  );

  if (!agentId) {
    printQaChecks(checks);
    process.exit(1);
  }

  checks.push(
    ...(await verifyBakedToolsForRestaurant({
      agentId,
      restaurantId: ctx.restaurantId,
    }))
  );

  const { hint, firstMessage, prompt } = await readAgentMenuSnapshot(agentId);
  checks.push({
    name: "agent: system prompt present",
    ok: Boolean(prompt && prompt.length > 200),
    detail: prompt ? `${prompt.length} chars` : "missing",
  });
  checks.push({
    name: "agent: menu size hint in prompt",
    ok: hint != null,
    detail: hint
      ? `${hint.categoryCount} cat / ${hint.itemCount} items`
      : "not found",
  });
  checks.push({
    name: "agent: first_message has no templates",
    ok: !firstMessageHasUnresolvedTemplates(firstMessage),
  });

  const pass = printQaChecks(checks);

  console.log(
    redactSecrets(
      JSON.stringify(
        {
          restaurant_id: ctx.restaurantId,
          restaurant_name: ctx.restaurantName,
          organization_id: ctx.organizationId,
          agent_id: agentId,
          created_restaurant: ctx.created,
          provision_status: after?.elevenlabs_provision_status,
          last_sync_at: after?.elevenlabs_last_sync_at,
        },
        null,
        2
      )
    )
  );

  if (pass !== checks.length) process.exit(1);
})().catch((e) => {
  console.error(redactSecrets(e instanceof Error ? e.message : String(e)));
  process.exit(1);
});
