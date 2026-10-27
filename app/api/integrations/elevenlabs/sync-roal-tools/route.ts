import { NextResponse } from "next/server";
import { EnvValidationError } from "@/lib/env.shared";
import { getElevenLabsAgentId } from "@/lib/env.server";
import { authorizeInternalOpsRequest } from "@/lib/auth/internal-access";
import { syncRoalElevenLabsTools } from "@/lib/sync-elevenlabs-roal-tools";

export const runtime = "nodejs";

/**
 * POST — create/update ROAL webhook tools and attach to Conv AI agent.
 * Requires the ops bearer token (ELEVENLABS_SYNC_TOKEN) or a platform-admin session;
 * an unset token no longer opens the route.
 */
export async function POST(req: Request) {
  if (!(await authorizeInternalOpsRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("agent_id")?.trim() ?? "";
    const body = await req.json().catch(() => ({}));
    const fromBody =
      typeof body === "object" &&
      body !== null &&
      typeof (body as { agent_id?: unknown }).agent_id === "string"
        ? (body as { agent_id: string }).agent_id.trim()
        : "";
    const agentId = getElevenLabsAgentId(fromBody || q || null);
    const bodyObj =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : {};
    const restaurantId =
      typeof bodyObj.restaurant_id === "string"
        ? bodyObj.restaurant_id.trim()
        : "";
    const restaurantName =
      typeof bodyObj.restaurant_name === "string"
        ? bodyObj.restaurant_name.trim()
        : "";
    if (!agentId) {
      return NextResponse.json(
        {
          error:
            "Missing agent_id: JSON { agent_id } or query ?agent_id= or ELEVENLABS_AGENT_ID",
        },
        { status: 400 }
      );
    }
    const result = await syncRoalElevenLabsTools({
      agentId,
      ...(restaurantId
        ? { restaurantId, restaurantName }
        : {}),
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof EnvValidationError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
