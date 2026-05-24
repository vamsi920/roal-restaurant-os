"use client";

import { useCallback, useRef, useState } from "react";
import {
  applyOrderStatusLocally,
  isExpectedStatusAfterAction,
} from "@/lib/orders/apply-order-status";
import type { OrderAction } from "@/lib/order-status";
import type { DraftOrderRow } from "@/lib/types";

type PendingEntry = {
  action: OrderAction;
  snapshot: DraftOrderRow;
  optimisticUpdatedAt: string;
};

export function useOrderStatusActions(
  restaurantId: string,
  setDraftRows: React.Dispatch<React.SetStateAction<DraftOrderRow[]>>
) {
  const [pending, setPending] = useState<Record<string, OrderAction>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const pendingRef = useRef<Map<string, PendingEntry>>(new Map());

  const clearError = useCallback((orderId: string) => {
    setErrors((prev) => {
      if (!prev[orderId]) return prev;
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  }, []);

  const applyAction = useCallback(
    async (order: DraftOrderRow, action: OrderAction) => {
      if (pendingRef.current.has(order.id)) return;

      const optimistic = applyOrderStatusLocally(order, action);
      if (!optimistic) {
        setErrors((prev) => ({
          ...prev,
          [order.id]: `Cannot ${action} this order`,
        }));
        return;
      }

      pendingRef.current.set(order.id, {
        action,
        snapshot: order,
        optimisticUpdatedAt: optimistic.updated_at,
      });
      setPending((prev) => ({ ...prev, [order.id]: action }));
      clearError(order.id);
      setDraftRows((rows) =>
        rows.map((r) => (r.id === order.id ? optimistic : r))
      );

      try {
        const res = await fetch(
          `/api/restaurants/${restaurantId}/orders/${order.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          }
        );
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          order?: DraftOrderRow;
        };

        if (!res.ok || !body.order) {
          throw new Error(body.error ?? "Update failed");
        }

        setDraftRows((rows) =>
          rows.map((r) => (r.id === order.id ? body.order! : r))
        );
      } catch (e) {
        const entry = pendingRef.current.get(order.id);
        if (entry) {
          setDraftRows((rows) =>
            rows.map((r) => (r.id === order.id ? entry.snapshot : r))
          );
        }
        setErrors((prev) => ({
          ...prev,
          [order.id]: e instanceof Error ? e.message : "Update failed",
        }));
      } finally {
        pendingRef.current.delete(order.id);
        setPending((prev) => {
          const next = { ...prev };
          delete next[order.id];
          return next;
        });
      }
    },
    [restaurantId, setDraftRows, clearError]
  );

  const mergeRealtimeRow = useCallback((incoming: DraftOrderRow): boolean => {
    const entry = pendingRef.current.get(incoming.id);
    if (!entry) return true;

    if (isExpectedStatusAfterAction(entry.action, incoming.status)) {
      pendingRef.current.delete(incoming.id);
      setPending((prev) => {
        const next = { ...prev };
        delete next[incoming.id];
        return next;
      });
      return true;
    }

    const incomingTs = new Date(incoming.updated_at).getTime();
    const optimisticTs = new Date(entry.optimisticUpdatedAt).getTime();
    if (incomingTs >= optimisticTs) {
      pendingRef.current.delete(incoming.id);
      setPending((prev) => {
        const next = { ...prev };
        delete next[incoming.id];
        return next;
      });
      setErrors((prev) => ({
        ...prev,
        [incoming.id]: "Order was updated elsewhere — refreshed",
      }));
      return true;
    }

    return false;
  }, []);

  return {
    applyAction,
    pending,
    errors,
    clearError,
    mergeRealtimeRow,
  };
}
