import { agentToolOptionsResponse } from "@/lib/agent-tools/server/json";
import { handleGetCallerHistory } from "@/lib/agent-tools/server/tools/get-caller-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ElevenLabs webhook tool `get-caller-history` (accepts POST); logic in lib/agent-tools/server/tools/get-caller-history.ts.
 * Every method goes to the handler so unsupported methods get the same JSON 405 as the old edge function.
 */
const handler = (req: Request): Promise<Response> => handleGetCallerHistory(req);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;

export function OPTIONS(): Response {
  return agentToolOptionsResponse();
}
