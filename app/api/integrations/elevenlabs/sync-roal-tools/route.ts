import { NextResponse } from "next/server";
import { EnvValidationError } from "@/lib/env.shared";
import { getElevenLabsAgentId, getElevenLabsSyncToken } from "@/lib/env.server";
import { syncRoalElevenLabsTools } from "@/lib/sync-elevenlabs-roal-tools";

export const runtime = "nodejs";

function authorize(req: Request): boolean {
  const token = getElevenLabsSyncToken();
  if (!token) return true;
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return bearer === token;
}

/** POST — create/update ROAL webhook tools and attach to Conv AI agent. */
export async function POST(req: Request) {
  if (!authorize(req)) {
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
