import { randomUUID } from "node:crypto";
import { CASCADES, DEFAULT_RESTAURANT_STEPS, tableSpec, type Row } from "@/lib/db/schema";
import type { DocStore, PushdownFilter } from "@/lib/db/store";

/* ==========================================================================
   A small query builder with the same chain shape the app already used
   (from().select().eq().order().limit().maybeSingle(), insert/update/upsert/
   delete, count). Backed by a DocStore (Firestore or memory).
   Tenant isolation is NOT automatic: callers scope by restaurant/org id.
   ========================================================================== */

export type DbError = { message: string; code?: string; details?: string; hint?: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbResult<T = any> = { data: T; error: DbError | null; count: number | null; status: number };

type Op = "eq" | "neq" | "in" | "is" | "gt" | "gte" | "lt" | "lte" | "ilike" | "like" | "contains" | "not";
type Filter = { column: string; op: Op; value: unknown; negateOp?: Op };
type Order = { column: string; ascending: boolean; nullsFirst: boolean };
type Embed = { alias: string; table: string; fk: string; columns: string[] | "*" };

function docIdFor(table: string, row: Row): string {
  const { pk } = tableSpec(table);
  return pk.map((c) => String(row[c] ?? "")).join("__").replace(/\//g, "_");
}

function applyDefaults(table: string, row: Row): Row {
  const spec = tableSpec(table);
  const out: Row = { ...row };
  for (const [k, v] of Object.entries(spec.defaults ?? {})) {
    if (out[k] === undefined) out[k] = typeof v === "function" ? (v as () => unknown)() : structuredClone(v);
  }
  const autoId = spec.autoId ?? (spec.pk.length === 1 && spec.pk[0] === "id");
  if (autoId && (out.id === undefined || out.id === null || out.id === "")) out.id = randomUUID();
  // Drop undefined (Firestore rejects it; Postgres treated it as default/NULL).
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? 1 : -1;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

function likeToRegex(pattern: string, insensitive: boolean): RegExp {
  const esc = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${esc}$`, insensitive ? "is" : "s");
}

function parseInList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const m = value.trim().match(/^\((.*)\)$/);
    const body = m ? m[1] : value;
    return body.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
  }
  return [value];
}

function containsValue(hay: unknown, needle: unknown): boolean {
  if (Array.isArray(hay)) {
    const needles = Array.isArray(needle) ? needle : [needle];
    return needles.every((n) => hay.some((h) => JSON.stringify(h) === JSON.stringify(n)));
  }
  if (hay && typeof hay === "object" && needle && typeof needle === "object") {
    return Object.entries(needle as Row).every(([k, v]) => JSON.stringify((hay as Row)[k]) === JSON.stringify(v));
  }
  return false;
}

function matchOne(row: Row, f: Filter): boolean {
  const v = row[f.column];
  switch (f.op) {
    case "eq":
      return v === f.value || (v != null && f.value != null && String(v) === String(f.value) && typeof v !== "object");
    case "neq":
      return !(v === f.value || (v != null && String(v) === String(f.value)));
    case "in":
      return parseInList(f.value).some((x) => x === v || (v != null && String(x) === String(v)));
    case "is":
      return f.value === null ? v === null || v === undefined : v === f.value;
    case "gt":
      return v != null && compare(v, f.value) > 0;
    case "gte":
      return v != null && compare(v, f.value) >= 0;
    case "lt":
      return v != null && compare(v, f.value) < 0;
    case "lte":
      return v != null && compare(v, f.value) <= 0;
    case "ilike":
      return typeof v === "string" && likeToRegex(String(f.value), true).test(v);
    case "like":
      return typeof v === "string" && likeToRegex(String(f.value), false).test(v);
    case "contains":
      return containsValue(v, f.value);
    case "not":
      return !matchOne(row, { column: f.column, op: f.negateOp ?? "eq", value: f.value });
    default:
      return true;
  }
}

function parseSelect(columns: string | undefined): { cols: string[] | "*"; embeds: Embed[] } {
  const raw = (columns ?? "*").replace(/\s+/g, " ").trim();
  if (!raw || raw === "*") return { cols: "*", embeds: [] };
  const embeds: Embed[] = [];
  // alias:table ( col, col )  or  table ( ... )
  const withoutEmbeds = raw.replace(/([a-z_]+)(?::([a-z_]+))?(?:!inner)?\s*\(([^()]*)\)/gi, (_m, a: string, t: string | undefined, inner: string) => {
    const alias = a;
    const table = t ?? a;
    const innerCols = inner.trim() === "*" || !inner.trim() ? "*" : inner.split(",").map((s) => s.trim()).filter(Boolean);
    embeds.push({ alias, table, fk: `${alias.replace(/s$/, "")}_id`, columns: innerCols });
    return "";
  });
  const cols = withoutEmbeds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (cols.includes("*")) return { cols: "*", embeds };
  return { cols: cols.map((c) => c.split(":").pop()!.split("::")[0]!.trim()), embeds };
}

function project(row: Row, cols: string[] | "*"): Row {
  if (cols === "*") return row;
  const out: Row = {};
  for (const c of cols) if (c in row) out[c] = row[c];
  return out;
}

type Mode = "select" | "insert" | "update" | "upsert" | "delete";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class QueryBuilder<T = any> implements PromiseLike<DbResult<T>> {
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitN: number | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private selectCols: string | undefined;
  private wantsReturn = false;
  private countMode: "exact" | null = null;
  private headOnly = false;
  private singleMode: "single" | "maybe" | null = null;
  private mode: Mode = "select";
  private payload: Row | Row[] | null = null;
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};

  constructor(private readonly store: DocStore, private readonly table: string) {}

  /* ---- verbs ---- */
  select(columns?: string, opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }): this {
    if (this.mode === "select") {
      this.selectCols = columns;
    } else {
      this.wantsReturn = true;
      this.selectCols = columns;
    }
    if (opts?.count) this.countMode = "exact";
    if (opts?.head) this.headOnly = true;
    return this;
  }
  insert(values: Row | Row[]): this {
    this.mode = "insert";
    this.payload = values;
    return this;
  }
  update(values: Row): this {
    this.mode = "update";
    this.payload = values;
    return this;
  }
  upsert(values: Row | Row[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.mode = "upsert";
    this.payload = values;
    this.upsertOpts = opts ?? {};
    return this;
  }
  delete(): this {
    this.mode = "delete";
    return this;
  }

  /* ---- filters ---- */
  eq(column: string, value: unknown): this { this.filters.push({ column, op: "eq", value }); return this; }
  neq(column: string, value: unknown): this { this.filters.push({ column, op: "neq", value }); return this; }
  in(column: string, values: readonly unknown[]): this { this.filters.push({ column, op: "in", value: [...values] }); return this; }
  is(column: string, value: unknown): this { this.filters.push({ column, op: "is", value }); return this; }
  gt(column: string, value: unknown): this { this.filters.push({ column, op: "gt", value }); return this; }
  gte(column: string, value: unknown): this { this.filters.push({ column, op: "gte", value }); return this; }
  lt(column: string, value: unknown): this { this.filters.push({ column, op: "lt", value }); return this; }
  lte(column: string, value: unknown): this { this.filters.push({ column, op: "lte", value }); return this; }
  ilike(column: string, pattern: string): this { this.filters.push({ column, op: "ilike", value: pattern }); return this; }
  like(column: string, pattern: string): this { this.filters.push({ column, op: "like", value: pattern }); return this; }
  contains(column: string, value: unknown): this { this.filters.push({ column, op: "contains", value }); return this; }
  match(query: Row): this { for (const [k, v] of Object.entries(query)) this.eq(k, v); return this; }
  not(column: string, op: string, value: unknown): this {
    this.filters.push({ column, op: "not", negateOp: op as Op, value });
    return this;
  }
  filter(column: string, op: string, value: unknown): this {
    if (op.startsWith("not.")) return this.not(column, op.slice(4), value);
    this.filters.push({ column, op: op as Op, value: op === "in" ? parseInList(value) : value });
    return this;
  }

  /* ---- modifiers ---- */
  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this {
    const ascending = opts?.ascending ?? true;
    this.orders.push({ column, ascending, nullsFirst: opts?.nullsFirst ?? !ascending });
    return this;
  }
  limit(n: number): this { this.limitN = n; return this; }
  range(from: number, to: number): this { this.rangeFrom = from; this.rangeTo = to; return this; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maybeSingle<R = any>(): QueryBuilder<R | null> { this.singleMode = "maybe"; return this as unknown as QueryBuilder<R | null>; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  single<R = any>(): QueryBuilder<R> { this.singleMode = "single"; return this as unknown as QueryBuilder<R>; }
  abortSignal(): this { return this; }
  returns<R>(): QueryBuilder<R> { return this as unknown as QueryBuilder<R>; }

  then<R1 = DbResult<T>, R2 = never>(
    onfulfilled?: ((value: DbResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): Promise<R1 | R2> {
    return this.execute().then(onfulfilled as never, onrejected as never);
  }

  /* ---- execution ---- */
  private pushdown(): PushdownFilter[] {
    const out: PushdownFilter[] = [];
    for (const f of this.filters) {
      if (f.op === "eq" && f.value !== null && typeof f.value !== "object") out.push({ column: f.column, op: "==", value: f.value });
      else if (f.op === "in") {
        const list = parseInList(f.value);
        if (list.every((v) => v !== null && typeof v !== "object")) out.push({ column: f.column, op: "in", value: list });
      }
    }
    return out;
  }

  private async matching(): Promise<Row[]> {
    const { pk } = tableSpec(this.table);
    // Fast path: lookup by full primary key.
    const pkEq = pk.every((c) => this.filters.some((f) => f.op === "eq" && f.column === c && f.value != null));
    let rows: Row[];
    if (pkEq) {
      const key: Row = {};
      for (const c of pk) key[c] = this.filters.find((f) => f.op === "eq" && f.column === c)!.value;
      const row = await this.store.get(this.table, docIdFor(this.table, key));
      rows = row ? [row] : [];
    } else {
      rows = await this.store.list(this.table, this.pushdown());
    }
    return rows.filter((r) => this.filters.every((f) => matchOne(r, f)));
  }

  private sortAndSlice(rows: Row[]): Row[] {
    const sorted = this.orders.length
      ? [...rows].sort((a, b) => {
          for (const o of this.orders) {
            const av = a[o.column];
            const bv = b[o.column];
            const an = av === null || av === undefined;
            const bn = bv === null || bv === undefined;
            if (an || bn) {
              if (an && bn) continue;
              return an === o.nullsFirst ? -1 : 1;
            }
            const c = compare(av, bv);
            if (c !== 0) return o.ascending ? c : -c;
          }
          return 0;
        })
      : rows;
    let out = sorted;
    if (this.rangeFrom !== null && this.rangeTo !== null) out = out.slice(this.rangeFrom, this.rangeTo + 1);
    if (this.limitN !== null) out = out.slice(0, this.limitN);
    return out;
  }

  private async withEmbeds(rows: Row[], embeds: Embed[]): Promise<Row[]> {
    if (!embeds.length) return rows;
    const out: Row[] = [];
    for (const row of rows) {
      const next = { ...row };
      for (const e of embeds) {
        const fkVal = row[e.fk];
        if (fkVal == null) {
          next[e.alias] = null;
          continue;
        }
        const target = await this.store.get(e.table, String(fkVal));
        next[e.alias] = target ? project(target, e.columns) : null;
      }
      out.push(next);
    }
    return out;
  }

  private async uniqueViolation(row: Row, ignoreId?: string): Promise<DbError | null> {
    const spec = tableSpec(this.table);
    for (const cols of spec.unique ?? []) {
      if (cols.some((c) => row[c] === undefined || row[c] === null)) continue;
      const existing = await this.store.list(
        this.table,
        cols.map((c) => ({ column: c, op: "==" as const, value: row[c] }))
      );
      const clash = existing.find((e) => docIdFor(this.table, e) !== ignoreId);
      if (clash) {
        return {
          code: "23505",
          message: `duplicate key value violates unique constraint "${this.table}_${cols.join("_")}_key"`,
        };
      }
    }
    return null;
  }

  private shape(rows: Row[], count: number | null): DbResult<T> {
    const parsed = parseSelect(this.selectCols);
    const aliases = parsed.embeds.map((e) => e.alias);
    const projected = rows.map((r) => {
      const p = project(r, parsed.cols);
      for (const a of aliases) if (a in r) p[a] = r[a];
      return p;
    });
    if (this.headOnly) return { data: null as T, error: null, count, status: 200 };
    if (this.singleMode) {
      if (projected.length === 0) {
        if (this.singleMode === "maybe") return { data: null as T, error: null, count, status: 200 };
        return { data: null as T, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }, count, status: 406 };
      }
      if (projected.length > 1) {
        return { data: null as T, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }, count, status: 406 };
      }
      return { data: projected[0] as T, error: null, count, status: 200 };
    }
    return { data: projected as T, error: null, count, status: 200 };
  }

  async execute(): Promise<DbResult<T>> {
    try {
      switch (this.mode) {
        case "select": {
          const parsed = parseSelect(this.selectCols);
          const all = await this.matching();
          const count = this.countMode ? all.length : null;
          const rows = await this.withEmbeds(this.sortAndSlice(all), parsed.embeds);
          return this.shape(rows, count);
        }
        case "insert": {
          const input = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
          const inserted: Row[] = [];
          for (const raw of input) {
            const row = applyDefaults(this.table, raw);
            const id = docIdFor(this.table, row);
            if (await this.store.get(this.table, id)) {
              return { data: null as T, error: { code: "23505", message: `duplicate key value violates unique constraint "${this.table}_pkey"` }, count: null, status: 409 };
            }
            const clash = await this.uniqueViolation(row);
            if (clash) return { data: null as T, error: clash, count: null, status: 409 };
            await this.store.set(this.table, id, row);
            await afterInsert(this.store, this.table, row);
            inserted.push(row);
          }
          return this.wantsReturn ? this.shape(inserted, null) : { data: null as T, error: null, count: null, status: 201 };
        }
        case "upsert": {
          const input = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
          const conflictCols = this.upsertOpts.onConflict?.split(",").map((s) => s.trim()).filter(Boolean) ?? tableSpec(this.table).pk;
          const written: Row[] = [];
          for (const raw of input) {
            const existing = await this.store.list(
              this.table,
              conflictCols.filter((c) => raw[c] != null).map((c) => ({ column: c, op: "==" as const, value: raw[c] }))
            );
            const hit = conflictCols.every((c) => raw[c] != null) ? existing[0] : undefined;
            if (hit) {
              if (this.upsertOpts.ignoreDuplicates) continue;
              const merged: Row = { ...hit, ...raw };
              for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
              await this.store.set(this.table, docIdFor(this.table, hit), merged);
              written.push(merged);
            } else {
              const row = applyDefaults(this.table, raw);
              await this.store.set(this.table, docIdFor(this.table, row), row);
              await afterInsert(this.store, this.table, row);
              written.push(row);
            }
          }
          return this.wantsReturn ? this.shape(written, null) : { data: null as T, error: null, count: null, status: 201 };
        }
        case "update": {
          const patch = { ...(this.payload as Row) };
          for (const k of Object.keys(patch)) if (patch[k] === undefined) delete patch[k];
          const rows = await this.matching();
          const updated: Row[] = [];
          for (const row of rows) {
            const next = { ...row, ...patch };
            const id = docIdFor(this.table, row);
            const clash = await this.uniqueViolation(next, id);
            if (clash) return { data: null as T, error: clash, count: null, status: 409 };
            await this.store.set(this.table, id, next);
            updated.push(next);
          }
          return this.wantsReturn
            ? this.shape(updated, this.countMode ? updated.length : null)
            : { data: null as T, error: null, count: this.countMode ? updated.length : null, status: 204 };
        }
        case "delete": {
          const rows = await this.matching();
          for (const row of rows) await deleteCascade(this.store, this.table, row);
          return this.wantsReturn
            ? this.shape(rows, this.countMode ? rows.length : null)
            : { data: null as T, error: null, count: this.countMode ? rows.length : null, status: 204 };
        }
      }
    } catch (e) {
      return {
        data: null as T,
        error: { message: e instanceof Error ? e.message : String(e) },
        count: null,
        status: 500,
      };
    }
  }
}


export async function deleteCascade(store: DocStore, table: string, row: Row): Promise<void> {
  for (const child of CASCADES[table] ?? []) {
    const parentKey = table === "restaurants" || table === "organizations" || table === "categories" || table === "items" || table === "profiles" ? row.id : undefined;
    if (parentKey == null) continue;
    const kids = await store.list(child.table, [{ column: child.column, op: "==", value: parentKey }]);
    for (const kid of kids) await deleteCascade(store, child.table, kid);
  }
  await store.remove(table, docIdFor(table, row));
}

/** What the old Postgres triggers did after inserts. */
async function afterInsert(store: DocStore, table: string, row: Row): Promise<void> {
  const ts = new Date().toISOString();
  if (table === "organizations") {
    const id = String(row.id);
    if (!(await store.get("organization_onboarding", id))) {
      await store.set("organization_onboarding", id, {
        organization_id: id,
        steps: { account: { status: "in_progress" } },
        current_step: "account",
        started_at: ts,
        updated_at: ts,
      });
    }
  }
  if (table === "restaurants") {
    const rid = String(row.id);
    const orgId = row.organization_id;
    if (!(await store.get("restaurant_profiles", rid))) {
      const profile = applyDefaults("restaurant_profiles", { restaurant_id: rid, organization_id: orgId });
      await store.set("restaurant_profiles", rid, profile);
      await afterInsert(store, "restaurant_profiles", profile);
    }
    if (!(await store.get("restaurant_onboarding", rid))) {
      await store.set("restaurant_onboarding", rid, {
        restaurant_id: rid,
        organization_id: orgId,
        steps: structuredClone(DEFAULT_RESTAURANT_STEPS),
        current_step: "restaurant_profile",
        started_at: ts,
        updated_at: ts,
      });
    }
  }
  if (table === "restaurant_profiles") {
    const rid = String(row.restaurant_id);
    const existing = await store.list("restaurant_weekly_hours", [{ column: "restaurant_id", op: "==", value: rid }]);
    const have = new Set(existing.map((r) => Number(r.day_of_week)));
    for (let d = 0; d <= 6; d += 1) {
      if (have.has(d)) continue;
      const h = applyDefaults("restaurant_weekly_hours", {
        restaurant_id: rid,
        day_of_week: d,
        is_closed: false,
        open_time: "11:00",
        close_time: "21:00",
      });
      await store.set("restaurant_weekly_hours", docIdFor("restaurant_weekly_hours", h), h);
    }
  }
}
