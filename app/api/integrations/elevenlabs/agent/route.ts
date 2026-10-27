import { NextResponse } from "next/server";
import { authorizeInternalOpsRequest } from "@/lib/auth/internal-access";
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

const UNAUTHORIZED = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/**
 * GET — fetch Conv AI agent JSON (keys stay server-side).
 * Platform-internal: any agent id can be addressed, so only the ops bearer token or a
 * platform-admin session may call it.
 */
export async function GET(req: Request) {
  if (!(await authorizeInternalOpsRequest(req))) return UNAUTHORIZED();
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

/** PATCH — forward JSON body to ElevenLabs (partial agent update). Platform-internal. */
export async function PATCH(req: Request) {
  if (!(await authorizeInternalOpsRequest(req))) return UNAUTHORIZED();
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
