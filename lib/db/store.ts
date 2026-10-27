import type { Row } from "@/lib/db/schema";

/** Where-clause the backend can push down (equality / membership only). */
export type PushdownFilter = { column: string; op: "==" | "in"; value: unknown };

export interface DocStore {
  readonly kind: "firestore" | "memory";
  list(table: string, filters: PushdownFilter[]): Promise<Row[]>;
  get(table: string, docId: string): Promise<Row | null>;
  set(table: string, docId: string, row: Row): Promise<void>;
  remove(table: string, docId: string): Promise<void>;
}

/* --------------------------------------------------------------------------
   In-memory store (demo mode + tests). Optional JSON persistence in dev so a
   demo workspace survives dev-server restarts.
   -------------------------------------------------------------------------- */

type MemoryData = Record<string, Record<string, Row>>;

const g = globalThis as unknown as { __roalMemoryDb?: MemoryData; __roalMemoryDbLoaded?: boolean };

function persistPath(): string | null {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return null;
  if (process.env.ROAL_DEMO_DB_FILE === "off") return null;
  return process.env.ROAL_DEMO_DB_FILE || `${process.cwd()}/.data/demo-db.json`;
}

function loadMemory(): MemoryData {
  if (g.__roalMemoryDb) return g.__roalMemoryDb;
  let data: MemoryData = {};
  const file = persistPath();
  if (file && typeof window === "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("node:fs") as typeof import("node:fs");
      if (fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, "utf8")) as MemoryData;
    } catch {
      data = {};
    }
  }
  g.__roalMemoryDb = data;
  return data;
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleFlush() {
  const file = persistPath();
  if (!file) return;
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("node:fs") as typeof import("node:fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("node:path") as typeof import("node:path");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(g.__roalMemoryDb ?? {}));
    } catch {
      // persistence is best-effort
    }
  }, 150);
}

const clone = <T,>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));

export function createMemoryStore(): DocStore {
  return {
    kind: "memory",
    async list(table, filters) {
      const rows = Object.values(loadMemory()[table] ?? {});
      return rows
        .filter((r) =>
          filters.every((f) =>
            f.op === "=="
              ? r[f.column] === f.value
              : Array.isArray(f.value) && (f.value as unknown[]).includes(r[f.column])
          )
        )
        .map(clone);
    },
    async get(table, docId) {
      const row = loadMemory()[table]?.[docId];
      return row ? clone(row) : null;
    },
    async set(table, docId, row) {
      const data = loadMemory();
      (data[table] ??= {})[docId] = clone(row);
      scheduleFlush();
    },
    async remove(table, docId) {
      const data = loadMemory();
      if (data[table]) delete data[table][docId];
      scheduleFlush();
    },
  };
}

/** Test helper: wipe the in-memory store. */
export function resetMemoryStore(seed: MemoryData = {}): void {
  g.__roalMemoryDb = clone(seed);
}

export function dumpMemoryStore(): MemoryData {
  return clone(loadMemory());
}
