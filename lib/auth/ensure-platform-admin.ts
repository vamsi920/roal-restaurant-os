import type { User } from "@supabase/supabase-js";
import { LEGACY_POC_ORGANIZATION_ID } from "@/lib/types";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { getServiceRoleSupabase } from "@/lib/supabase/server";

/** Ensures the platform admin user has at least one membership (service role). */
export async function ensurePlatformAdminMembership(
  user: Pick<User, "id" | "email">
): Promise<void> {
  if (!isPlatformAdminEmail(user.email)) return;

  const service = getServiceRoleSupabase();
  if (!service) return;

  const { data: existing, error: readErr } = await service
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (readErr) throw new Error(readErr.message);
  if (existing?.length) return;

  const { error: insertErr } = await service.from("memberships").insert({
    organization_id: LEGACY_POC_ORGANIZATION_ID,
    user_id: user.id,
    role: "owner",
  });

  if (insertErr && insertErr.code !== "23505") {
    throw new Error(insertErr.message);
  }
}
