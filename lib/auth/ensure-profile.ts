import type { Db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session-user";

export async function ensureUserProfile(
  db: Db,
  user: Pick<SessionUser, "id" | "email" | "user_metadata">
): Promise<void> {
  const displayName =
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ??
    user.email ??
    null;

  const { error } = await db
    .from("profiles")
    .upsert({ id: user.id, display_name: displayName }, { onConflict: "id", ignoreDuplicates: false });

  if (error) {
    throw new Error(`Profile setup failed: ${error.message}`);
  }
}
