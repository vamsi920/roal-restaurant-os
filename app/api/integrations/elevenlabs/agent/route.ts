import { NextResponse } from "next/server";
import { EnvValidationError } from "@/lib/env.shared";
import { getElevenLabsAgentId } from "@/lib/env.server";
import {
  getConvaiAgent,
  patchConvaiAgent,
} from "@/lib/elevenlabs";

export const runtime = "nodejs";

function resolveAgentId(req: Request): string | null {
  const url = new URL(req.url);
  const q = url.searchParams.get("agent_id")?.trim();
  return getElevenLabsAgentId(q || null);
}

/** GET — fetch Conv AI agent JSON (keys stay server-side). */
export async function GET(req: Request) {
  try {
    const agentId = resolveAgentId(req);
    if (!agentId) {
      return NextResponse.json(
        {
          error:
            "Missing agent_id query or ELEVENLABS_AGENT_ID in server environment",
        },
        { status: 400 }
      );
    }
    const data = await getConvaiAgent(agentId);
    return NextResponse.json({ agent_id: agentId, agent: data });
  } catch (e) {
    if (e instanceof EnvValidationError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    const msg = e instanceof Error ? e.message : "ElevenLabs request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

/** PATCH — forward JSON body to ElevenLabs (partial agent update). */
export async function PATCH(req: Request) {
  try {
    const agentId = resolveAgentId(req);
    if (!agentId) {
      return NextResponse.json(
        {
          error:
            "Missing agent_id query or ELEVENLABS_AGENT_ID in server environment",
        },
        { status: 400 }
      );
    }
    const body = await req.json().catch(() => null);
    if (body === null || typeof body !== "object") {
      return NextResponse.json({ error: "JSON body required" }, { status: 400 });
    }
    const data = await patchConvaiAgent(agentId, body);
    return NextResponse.json({ agent_id: agentId, agent: data });
  } catch (e) {
    if (e instanceof EnvValidationError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    const msg = e instanceof Error ? e.message : "ElevenLabs request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
