import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { Row } from "@/lib/db/schema";
import type { DocStore } from "@/lib/db/store";

/** Firestore backend: equality/IN filters pushed down, everything else in memory. */
export function createFirestoreStore(): DocStore {
  return {
    kind: "firestore",
    async list(table, filters) {
      let q: FirebaseFirestore.Query = adminDb().collection(table);
      const memoryIn: Array<{ column: string; values: unknown[] }> = [];
      let usedIn = false;
      for (const f of filters) {
        if (f.op === "==") {
          q = q.where(f.column, "==", f.value);
        } else if (Array.isArray(f.value)) {
          const values = f.value as unknown[];
          if (values.length === 0) return [];
          if (!usedIn && values.length <= 30) {
            q = q.where(f.column, "in", values);
            usedIn = true;
          } else {
            memoryIn.push({ column: f.column, values });
          }
        }
      }
      const snap = await q.get();
      let rows = snap.docs.map((d) => d.data() as Row);
      for (const m of memoryIn) rows = rows.filter((r) => m.values.includes(r[m.column]));
      return rows;
    },
    async get(table, docId) {
      const doc = await adminDb().collection(table).doc(docId).get();
      return doc.exists ? (doc.data() as Row) : null;
    },
    async set(table, docId, row) {
      await adminDb().collection(table).doc(docId).set(row);
    },
    async remove(table, docId) {
      await adminDb().collection(table).doc(docId).delete();
    },
  };
}
