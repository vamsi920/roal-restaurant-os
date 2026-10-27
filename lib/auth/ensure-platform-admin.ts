import type { SessionUser } from "@/lib/auth/session-user";
import { LEGACY_POC_ORGANIZATION_ID } from "@/lib/types";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";

/** Ensures the platform admin user has at least one membership (service role). */
export async function ensurePlatformAdminMembership(
  user: Pick<SessionUser, "id" | "email">
): Promise<void> {
  if (!isPlatformAdminEmail(user.email)) return;

  const service = getDb();
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
