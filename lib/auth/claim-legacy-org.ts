import type { Db } from "@/lib/db";
import { LEGACY_POC_ORGANIZATION_ID } from "@/lib/types";

async function legacyMemberCount(supabase: Db): Promise<number> {
  const { data, error } = await supabase
    .from("memberships")
    .select("id")
    .eq("organization_id", LEGACY_POC_ORGANIZATION_ID)
    .limit(2);
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

/**
 * First authenticated user with no memberships can claim Legacy POC as owner
 * — but ONLY while that org exists and still has zero members.
 *
 * Postgres RLS used to enforce the "zero members" rule. The document store has no
 * RLS, so it is checked here; without it every new signup became an owner of the
 * Legacy POC org (and every restaurant in it).
 */
export async function tryClaimLegacyPocMembership(
  supabase: Db,
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

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", LEGACY_POC_ORGANIZATION_ID)
    .maybeSingle();
  if (orgErr) throw new Error(orgErr.message);
  if (!org) return false;

  if ((await legacyMemberCount(supabase)) > 0) return false;

  const { error: insertErr } = await supabase.from("memberships").insert({
    organization_id: LEGACY_POC_ORGANIZATION_ID,
    user_id: userId,
    role: "owner",
  });

  if (insertErr) {
    if (insertErr.code === "23505") return false;
    throw new Error(insertErr.message);
  }

  // No transactions in the store: if another user claimed concurrently, back out.
  if ((await legacyMemberCount(supabase)) > 1) {
    await supabase
      .from("memberships")
      .delete()
      .eq("organization_id", LEGACY_POC_ORGANIZATION_ID)
      .eq("user_id", userId);
    return false;
  }

  return true;
}
