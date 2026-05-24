import type { AgentToolErrorBody } from "./agent-tool-zod.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-client-info, apikey, x-roal-restaurant-id, x-roal-idempotency-key",
};

export { corsHeaders };

export function agentToolJsonResponse(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

export function agentToolErrorResponse(
  body: AgentToolErrorBody | Record<string, unknown>,
  status: number,
  extraHeaders?: Record<string, string>
): Response {
  return agentToolJsonResponse(body, status, extraHeaders);
}
