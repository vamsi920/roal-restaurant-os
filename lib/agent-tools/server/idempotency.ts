import type { Db } from "@/lib/db";

const TTL_MS = 24 * 60 * 60 * 1000;

/** Replay a stored tool response (24h TTL) from `agent_tool_idempotency`. */
export async function loadIdempotentResponse(
  db: Db,
  restaurantId: string,
  idempotencyKey: string,
  toolName: string
): Promise<{ httpStatus: number; body: unknown } | null> {
  const { data, error } = await db
    .from("agent_tool_idempotency")
    .select("response_body, http_status, created_at")
    .eq("restaurant_id", restaurantId)
    .eq("idempotency_key", idempotencyKey)
    .eq("tool_name", toolName)
    .maybeSingle();

  if (error || !data) return null;

  const createdAt = new Date(String(data.created_at)).getTime();
  if (Date.now() - createdAt > TTL_MS) {
    await db
      .from("agent_tool_idempotency")
      .delete()
      .eq("restaurant_id", restaurantId)
      .eq("idempotency_key", idempotencyKey)
      .eq("tool_name", toolName);
    return null;
  }

  return {
    httpStatus: Number(data.http_status ?? 200),
    body: data.response_body,
  };
}

export async function storeIdempotentResponse(
  db: Db,
  input: {
    restaurantId: string;
    idempotencyKey: string;
    toolName: string;
    httpStatus: number;
    body: unknown;
  }
): Promise<void> {
  await db.from("agent_tool_idempotency").upsert(
    {
      restaurant_id: input.restaurantId,
      idempotency_key: input.idempotencyKey,
      tool_name: input.toolName,
      http_status: input.httpStatus,
      response_body: input.body,
      created_at: new Date().toISOString(),
    },
    { onConflict: "restaurant_id,idempotency_key" }
  );
}
