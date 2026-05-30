/**
 * ROAL pass 24 — menu change → voice agent auto-sync QA.
 *
 * Uses a test restaurant with a dedicated agent (run qa-voice-agent-provision first).
 * Inserts a probe menu item, triggers menu content sync, verifies DB auto-sync status,
 * baked tools still scoped to the restaurant, and ElevenLabs prompt menu snapshot updated.
 *
 * Usage:
 *   npx tsx --env-file=.env --env-file=.env.local scripts/qa-menu-auto-sync.ts
 *   QA_RESTAURANT_ID=<uuid> npx tsx --env-file=.env --env-file=.env.local scripts/qa-menu-auto-sync.ts
 *   QA_CLEANUP=0  # leave probe item in menu
 *
 * Requires: same secrets as provision script; restaurant must have elevenlabs_agent_id.
 */
import { buildRestaurantOrderAgentPrompt } from "../lib/elevenlabs/agent-prompt";
import { getRestaurantProfile } from "../lib/restaurant-profile/helpers";
import {
  buildAgentHoursPromptFromBundle,
  loadRestaurantHoursBundle,
} from "../lib/restaurant-hours/helpers";
import { loadMenuPromptSnapshot } from "../lib/elevenlabs/load-menu-prompt-snapshot";
import {
  VOICE_AGENT_CONTENT_SYNC_TRIGGERS,
  defaultSyncRestaurantAgentAfterContentChangeDeps,
  syncRestaurantAgentAfterContentChange,
} from "../lib/voice-agent/sync-restaurant-agent-after-content-change";
import {
  checksFromSyncSummary,
  expectedMenuSnapshotFromDb,
  extractMenuSizeHint,
  loadProfileVoiceState,
  menuSnapshotsMatch,
  printQaChecks,
  readAgentMenuSnapshot,
  redactSecrets,
  requireServiceRoleSupabase,
  resolveQaRestaurant,
  verifyBakedToolsForRestaurant,
  type QaCheck,
} from "../lib/voice-agent/qa/live-helpers";

const QA_PROBE_PREFIX = "ROAL QA Sync Probe";

void (async () => {
  const sb = requireServiceRoleSupabase();
  const ctx = await resolveQaRestaurant(sb);
  const runId = Date.now().toString(36);
  const probeName = `${QA_PROBE_PREFIX} ${runId}`;
  const cleanup = process.env.QA_CLEANUP !== "0";

  const profileRow = await loadProfileVoiceState(sb, ctx.restaurantId);
  const agentId =
    profileRow?.elevenlabs_agent_id != null
      ? String(profileRow.elevenlabs_agent_id).trim()
      : "";
  if (!agentId) {
    throw new Error(
      "No elevenlabs_agent_id on profile. Run scripts/qa-voice-agent-provision.ts first."
    );
  }

  const checks: QaCheck[] = [];

  const beforeDb = await expectedMenuSnapshotFromDb(sb, ctx.restaurantId);
  const beforeAgent = await readAgentMenuSnapshot(agentId);

  checks.push({
    name: "baseline: menu snapshot from DB",
    ok: beforeDb != null && beforeDb.itemCount >= 0,
    detail: beforeDb
      ? `${beforeDb.categoryCount} cat / ${beforeDb.itemCount} items / ${beforeDb.modifierCount} mods`
      : "null",
  });
  checks.push({
    name: "baseline: agent prompt matches DB counts",
    ok: menuSnapshotsMatch(beforeAgent.hint, beforeDb),
  });

  const { data: category, error: catErr } = await sb
    .from("categories")
    .select("id")
    .eq("restaurant_id", ctx.restaurantId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (catErr) throw new Error(catErr.message);

  let categoryId = category?.id as string | undefined;
  if (!categoryId) {
    const { data: createdCat, error: createCatErr } = await sb
      .from("categories")
      .insert({
        restaurant_id: ctx.restaurantId,
        name: "ROAL QA",
        sort_order: 999,
      })
      .select("id")
      .single();
    if (createCatErr) throw new Error(createCatErr.message);
    categoryId = createdCat.id;
  }

  const { data: inserted, error: insertErr } = await sb
    .from("items")
    .insert({
      category_id: categoryId,
      name: probeName,
      description: `Inserted by qa-menu-auto-sync ${runId}`,
      price: 1,
      is_available: true,
      sort_order: 9999,
    })
    .select("id, name")
    .single();
  if (insertErr) throw new Error(insertErr.message);

  console.log(`Inserted probe item ${inserted.id} (${probeName})`);

  const afterInsertDb = await expectedMenuSnapshotFromDb(sb, ctx.restaurantId);
  checks.push({
    name: "menu edit: DB item count increased",
    ok:
      afterInsertDb != null &&
      beforeDb != null &&
      afterInsertDb.itemCount === beforeDb.itemCount + 1,
    detail: beforeDb && afterInsertDb
      ? `${beforeDb.itemCount} → ${afterInsertDb.itemCount}`
      : undefined,
  });

  const syncResult = await syncRestaurantAgentAfterContentChange(
    {
      restaurantId: ctx.restaurantId,
      restaurantName: ctx.restaurantName,
      trigger: VOICE_AGENT_CONTENT_SYNC_TRIGGERS.menu,
    },
    {
      ...defaultSyncRestaurantAgentAfterContentChangeDeps(),
      getSupabase: async () => sb,
    }
  );

  checks.push({
    name: "menu auto-sync: completed",
    ok: syncResult.ok === true && !syncResult.skipped,
    detail: syncResult.skipped
      ? `skipped: ${syncResult.skipReason}`
      : syncResult.error ?? undefined,
  });
  checks.push({
    name: "menu auto-sync: agent id unchanged",
    ok: syncResult.agentId === agentId,
  });
  checks.push(...checksFromSyncSummary(syncResult.summary, "menu sync"));

  const afterProfile = await loadProfileVoiceState(sb, ctx.restaurantId);
  checks.push({
    name: "profile: menu_auto_sync_status succeeded",
    ok: afterProfile?.elevenlabs_menu_auto_sync_status === "succeeded",
    detail: String(afterProfile?.elevenlabs_menu_auto_sync_status ?? "null"),
  });
  checks.push({
    name: "profile: menu_auto_sync_error cleared",
    ok: afterProfile?.elevenlabs_menu_auto_sync_error == null,
  });
  checks.push({
    name: "profile: last_sync_at updated",
    ok: Boolean(afterProfile?.elevenlabs_last_sync_at),
  });

  const summary = afterProfile?.elevenlabs_last_sync_summary as {
    content_change_trigger?: string;
  } | null;
  checks.push({
    name: "profile: sync summary records menu trigger",
    ok: summary?.content_change_trigger === VOICE_AGENT_CONTENT_SYNC_TRIGGERS.menu,
    detail: summary?.content_change_trigger,
  });

  checks.push(
    ...(await verifyBakedToolsForRestaurant({
      agentId,
      restaurantId: ctx.restaurantId,
    }))
  );

  const afterAgent = await readAgentMenuSnapshot(agentId);
  const afterDb = await expectedMenuSnapshotFromDb(sb, ctx.restaurantId);

  checks.push({
    name: "post-sync: agent prompt matches DB menu snapshot",
    ok: menuSnapshotsMatch(afterAgent.hint, afterDb),
    detail: afterAgent.hint && afterDb
      ? `agent ${afterAgent.hint.itemCount} / db ${afterDb.itemCount} items`
      : undefined,
  });
  checks.push({
    name: "post-sync: item count reflects probe insert",
    ok:
      afterAgent.hint != null &&
      beforeAgent.hint != null &&
      afterAgent.hint.itemCount === beforeAgent.hint.itemCount + 1,
    detail:
      beforeAgent.hint && afterAgent.hint
        ? `${beforeAgent.hint.itemCount} → ${afterAgent.hint.itemCount}`
        : undefined,
  });

  const profile = await getRestaurantProfile(sb, ctx.restaurantId);
  let hoursSection: string | null = null;
  try {
    const bundle = await loadRestaurantHoursBundle(sb, ctx.restaurantId);
    if (bundle) hoursSection = buildAgentHoursPromptFromBundle(bundle);
  } catch {
    // optional
  }
  const localPrompt = buildRestaurantOrderAgentPrompt({
    restaurantName: ctx.restaurantName,
    profile,
    hoursPromptSection: hoursSection,
    menu: afterDb,
  });
  const localHint = extractMenuSizeHint(localPrompt);
  checks.push({
    name: "post-sync: local prompt builder matches DB snapshot",
    ok: menuSnapshotsMatch(localHint, afterDb),
  });

  if (cleanup) {
    const { error: delErr } = await sb.from("items").delete().eq("id", inserted.id);
    if (delErr) throw new Error(delErr.message);
    console.log(`Removed probe item ${inserted.id}`);

    await syncRestaurantAgentAfterContentChange(
      {
        restaurantId: ctx.restaurantId,
        restaurantName: ctx.restaurantName,
        trigger: VOICE_AGENT_CONTENT_SYNC_TRIGGERS.menu,
      },
      {
        ...defaultSyncRestaurantAgentAfterContentChangeDeps(),
        getSupabase: async () => sb,
      }
    );

    const cleanedAgent = await readAgentMenuSnapshot(agentId);
    checks.push({
      name: "cleanup: agent prompt restored to baseline counts",
      ok: menuSnapshotsMatch(cleanedAgent.hint, beforeDb),
    });
  } else {
    console.log("QA_CLEANUP=0 — probe item left on menu");
  }

  const pass = printQaChecks(checks);

  console.log(
    redactSecrets(
      JSON.stringify(
        {
          restaurant_id: ctx.restaurantId,
          agent_id: agentId,
          probe_item_id: inserted.id,
          probe_item_name: probeName,
          cleanup,
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
