import type { AgentToolErrorBody } from "@/lib/agent-tools/schemas";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-client-info, apikey, x-roal-restaurant-id, x-roal-idempotency-key",
};

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

/** CORS preflight — same plain "ok" body the edge functions returned. */
export function agentToolOptionsResponse(): Response {
  return new Response("ok", { headers: corsHeaders });
}

export function methodNotAllowedResponse(message: "Use POST." | "Use GET or POST."): Response {
  return agentToolErrorResponse(
    { error: "method_not_allowed", code: "method_not_allowed", message },
    405
  );
}

export const INVALID_JSON_BODY = {
  error: "invalid_json",
  code: "invalid_json",
  message: "Request body must be valid JSON.",
  recovery_hint: "Send Content-Type: application/json.",
} as const;

export const INVALID_JSON_BODY_OBJECT_HINT = {
  ...INVALID_JSON_BODY,
  recovery_hint: "Send Content-Type: application/json with a JSON object.",
} as const;

/** Parse a JSON body; null when the body is not valid JSON. */
export async function readJsonBody(req: Request): Promise<{ ok: true; raw: unknown } | { ok: false }> {
  try {
    return { ok: true, raw: await req.json() };
  } catch {
    return { ok: false };
  }
}

export function databaseErrorResponse(message: string): Response {
  return agentToolErrorResponse(
    { error: "database_error", code: "database_error", message },
    500
  );
}
