import type { Db } from "@/lib/db";
import { getCloverConfig, refreshCloverTokens, type CloverConfig, type CloverTokens } from "@/lib/pos/clover";
import { openSecret, sealSecret } from "@/lib/pos/seal";

export type PosProvider = "clover";

/** Row in `pos_connections` (one per restaurant). Tokens are sealed; never send this row to the browser. */
export type PosConnectionRow = {
  restaurant_id: string;
  provider: PosProvider;
  merchant_id: string;
  merchant_name: string | null;
  environment: string;
  access_token_sealed: string;
  access_token_expires_at: number | null;
  refresh_token_sealed: string | null;
  refresh_token_expires_at: number | null;
  connected_by: string | null;
  last_sync_at: string | null;
  last_sync_error: string | null;
  created_at?: string;
  updated_at?: string;
};

/** What the settings card may show. */
export type PosConnectionSummary = {
  provider: PosProvider;
  merchantName: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
};

/** Refresh when the access token has less than this many seconds left. */
const REFRESH_MARGIN_SEC = 24 * 60 * 60;

export async function loadPosConnection(db: Db, restaurantId: string): Promise<PosConnectionRow | null> {
  const { data, error } = await db
    .from("pos_connections")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .maybeSingle<PosConnectionRow>();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export function summarizePosConnection(row: PosConnectionRow | null): PosConnectionSummary | null {
  if (!row) return null;
  return {
    provider: row.provider,
    merchantName: row.merchant_name,
    lastSyncAt: row.last_sync_at,
    lastSyncError: row.last_sync_error,
  };
}

function tokenFields(tokens: CloverTokens) {
  return {
    access_token_sealed: sealSecret(tokens.accessToken),
    access_token_expires_at: tokens.accessTokenExpiresAt,
    refresh_token_sealed: tokens.refreshToken ? sealSecret(tokens.refreshToken) : null,
    refresh_token_expires_at: tokens.refreshTokenExpiresAt,
  };
}

export async function saveCloverConnection(
  db: Db,
  input: {
    restaurantId: string;
    merchantId: string;
    merchantName: string | null;
    environment: string;
    tokens: CloverTokens;
    connectedBy: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db.from("pos_connections").upsert(
    {
      restaurant_id: input.restaurantId,
      provider: "clover",
      merchant_id: input.merchantId,
      merchant_name: input.merchantName,
      environment: input.environment,
      ...tokenFields(input.tokens),
      connected_by: input.connectedBy,
      last_sync_at: null,
      last_sync_error: null,
      updated_at: now,
    },
    { onConflict: "restaurant_id" }
  );
  if (error) throw new Error(error.message);
}

export async function deletePosConnection(db: Db, restaurantId: string): Promise<void> {
  const { error } = await db.from("pos_connections").delete().eq("restaurant_id", restaurantId);
  if (error) throw new Error(error.message);
}

export async function recordPosSync(db: Db, restaurantId: string, syncError: string | null): Promise<void> {
  const now = new Date().toISOString();
  await db
    .from("pos_connections")
    .update({ last_sync_at: now, last_sync_error: syncError, updated_at: now })
    .eq("restaurant_id", restaurantId);
}

/** Returns a usable Clover access token, refreshing (and saving) it when close to expiry. */
export async function freshCloverAccessToken(
  db: Db,
  row: PosConnectionRow,
  config: CloverConfig | null = getCloverConfig(),
  fetchImpl: typeof fetch = fetch,
  nowSec = Math.floor(Date.now() / 1000)
): Promise<{ config: CloverConfig; accessToken: string }> {
  if (!config) throw new Error("Clover is not configured on this server.");
  const expiresAt = row.access_token_expires_at;
  const stillGood = expiresAt == null || expiresAt - nowSec > REFRESH_MARGIN_SEC;
  if (stillGood || !row.refresh_token_sealed) {
    return { config, accessToken: openSecret(row.access_token_sealed) };
  }
  const tokens = await refreshCloverTokens(config, openSecret(row.refresh_token_sealed), fetchImpl);
  await db
    .from("pos_connections")
    .update({ ...tokenFields(tokens), updated_at: new Date().toISOString() })
    .eq("restaurant_id", row.restaurant_id);
  return { config, accessToken: tokens.accessToken };
}
