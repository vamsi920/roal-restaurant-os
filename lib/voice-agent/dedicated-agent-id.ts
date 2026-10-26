import { getElevenLabsAgentId } from "@/lib/env.server";
import { isSharedTemplateAgentLinked } from "@/lib/restaurant-launch/server-env";

export function resolveDedicatedElevenLabsAgentId(
  profileAgentId: string | null | undefined,
  templateAgentId?: string | null
): string | null {
  const linked =
    profileAgentId != null && String(profileAgentId).trim()
      ? String(profileAgentId).trim()
      : null;
  if (!linked) return null;

  const template =
    templateAgentId !== undefined ? templateAgentId : getElevenLabsAgentId();
  if (isSharedTemplateAgentLinked(linked, template)) return null;

  return linked;
}
