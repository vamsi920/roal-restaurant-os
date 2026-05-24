import type { SupabaseClient } from "@supabase/supabase-js";
import { LEGACY_POC_ORGANIZATION_ID } from "@/lib/types";

/**
 * First authenticated user with no memberships can claim Legacy POC as owner
 * when that org still has zero members (RLS bootstrap policy in migration 009/024).
 */
export async function tryClaimLegacyPocMembership(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: existing, error: readErr } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (readErr) {
    throw new Error(readErr.message);
  }
  if (existing?.length) return false;

  const { error: insertErr } = await supabase.from("memberships").insert({
    organization_id: LEGACY_POC_ORGANIZATION_ID,
    user_id: userId,
    role: "owner",
  });

  if (!insertErr) return true;

  if (insertErr.code === "23505") return false;

  const msg = insertErr.message.toLowerCase();
  if (
    msg.includes("row-level security") ||
    msg.includes("duplicate") ||
    insertErr.code === "42501"
  ) {
    return false;
  }

  throw new Error(insertErr.message);
}
