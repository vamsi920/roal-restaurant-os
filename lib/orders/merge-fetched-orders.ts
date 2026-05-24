import type { DraftOrderRow } from "@/lib/types";

/** Keep in-flight optimistic rows when a poll returns older server data. */
export function mergeFetchedDraftOrders(
  prev: DraftOrderRow[],
  fetched: DraftOrderRow[],
  pendingOrderIds: ReadonlySet<string>
): DraftOrderRow[] {
  if (pendingOrderIds.size === 0) return fetched;

  const prevById = new Map(prev.map((o) => [o.id, o]));
  const fetchedIds = new Set(fetched.map((o) => o.id));

  const merged = fetched.map((row) => {
    if (!pendingOrderIds.has(row.id)) return row;
    const local = prevById.get(row.id);
    if (!local) return row;
    const localTs = new Date(local.updated_at).getTime();
    const remoteTs = new Date(row.updated_at).getTime();
    return remoteTs > localTs ? row : local;
  });

  for (const row of prev) {
    if (pendingOrderIds.has(row.id) && !fetchedIds.has(row.id)) {
      merged.push(row);
    }
  }

  return merged;
}
