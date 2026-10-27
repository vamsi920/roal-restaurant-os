import { QueryBuilder, type DbResult } from "@/lib/db/query";
import { runRpc } from "@/lib/db/rpc";
import { createFirestoreStore } from "@/lib/db/firestore-store";
import { createMemoryStore, type DocStore } from "@/lib/db/store";

export type { DbError, DbResult } from "@/lib/db/query";
export type { Row } from "@/lib/db/schema";

/**
 * The app's database handle. Same chain shape as before
 * (`db.from("restaurants").select("*").eq("id", id).maybeSingle()`), backed by
 * Firestore when Firebase Admin is configured, else an in-memory demo store.
 *
 * Every query runs with full privileges: scope by restaurant / organization id
 * after checking access (lib/auth/context-server).
 */
export type Db = {
  readonly backend: "firestore" | "memory";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from<T = any>(table: string): QueryBuilder<T[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc<T = any>(name: string, args?: Record<string, unknown>): Promise<DbResult<T>>;
};

function makeDb(store: DocStore): Db {
  return {
    backend: store.kind,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: <T = any>(table: string) => new QueryBuilder<T[]>(store, table),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rpc: <T = any>(name: string, args: Record<string, unknown> = {}) =>
      runRpc(store, name, args) as Promise<DbResult<T>>,
  };
}

let cached: Db | null = null;

/** True when Firestore credentials exist (server only). */
export function isFirestoreConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT?.trim() || process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim());
}

/**
 * In production, refuse to fall back to the in-memory demo store: it loses all data on
 * every restart. Demo mode in production needs an explicit ROAL_DEMO_MODE=1.
 */
export function assertDurableStoreAllowed(env: NodeJS.ProcessEnv = process.env): void {
  const configured = Boolean(env.FIREBASE_SERVICE_ACCOUNT?.trim() || env.GOOGLE_APPLICATION_CREDENTIALS?.trim());
  if (configured) return;
  if (env.NODE_ENV !== "production") return;
  if (env.NEXT_PHASE === "phase-production-build") return;
  if (env.ROAL_DEMO_MODE === "1" || env.VITEST) return;
  throw new Error(
    "Firestore is not configured: set FIREBASE_SERVICE_ACCOUNT (or ROAL_DEMO_MODE=1 for a throwaway demo)."
  );
}

export function getDb(): Db {
  if (cached) return cached;
  assertDurableStoreAllowed();
  if (isFirestoreConfigured() && !process.env.VITEST) {
    cached = makeDb(createFirestoreStore());
  } else {
    cached = makeDb(createMemoryStore());
  }
  return cached;
}

/** Test helper: a db over a fresh in-memory store. */
export function createMemoryDb(): Db {
  return makeDb(createMemoryStore());
}

/** Back-compat aliases used across the codebase (all return the same handle). */
export const createServerDb = async (): Promise<Db> => getDb();
