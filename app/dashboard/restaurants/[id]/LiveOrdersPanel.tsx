"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { reportRealtimeDegraded } from "@/lib/notifications/report-realtime-degraded";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type {
  DbItem,
  DbModifier,
  DraftOrderRow,
  PhoneOrderReceiptRow,
} from "@/lib/types";
import {
  compareKitchenQueue,
  isTerminalOrderStatus,
  isVoiceCartStatus,
  normalizeOrderStatus,
} from "@/lib/order-status";
import { cn } from "@/lib/cn";
import { formatSupabaseClientError } from "@/lib/dashboard/format-user-error";
import { RESTAURANT_LIVE_ORDERS_LABEL } from "@/lib/dashboard-restaurant-labels";
import { CallStatusStrip } from "./CallStatusStrip";
import { KitchenOrderCard } from "./KitchenOrderCard";
import {
  OrderDetailModal,
  type OrderDetailSelection,
} from "./OrderDetailModal";
import {
  CustomerLine,
  OrderDetailsLink,
  OrderItemsList,
  PickupStatusBadge,
} from "./order-card-parts";
import { useOrderStatusActions } from "./useOrderStatusActions";
import { mergeFetchedDraftOrders } from "@/lib/orders/merge-fetched-orders";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";
import { LEGACY_CONFIRMED_STATUS } from "@/lib/order-status";
import {
  KdsDisconnectedNotice,
  KdsEmptyStatePanel,
  KdsLoadingPanel,
  KdsRealtimeIndicator,
  KdsRecoveryButton,
  KdsSyncErrorNotice,
} from "@/components/dashboard/kds-workspace-states";

function normalizeDraftRow(row: DraftOrderRow): DraftOrderRow {
  const status =
    row.status === LEGACY_CONFIRMED_STATUS ? "new" : row.status;
  return {
    ...row,
    status,
    accepted_at: row.accepted_at ?? null,
    in_progress_at: row.in_progress_at ?? null,
    ready_at: row.ready_at ?? null,
    completed_at: row.completed_at ?? null,
    canceled_at: row.canceled_at ?? null,
  };
}

function bootstrapKey(
  drafts: DraftOrderRow[],
  receipts: PhoneOrderReceiptRow[]
): string {
  const d = [...drafts]
    .map((r) => `${r.id}:${r.updated_at}:${r.status}`)
    .sort()
    .join("|");
  const r = [...receipts]
    .map((x) => `${x.id}:${x.created_at}`)
    .sort()
    .join("|");
  return `${d}__${r}`;
}

type Tab = "new" | "in_progress" | "done";

const DONE_DRAFT_VISIBLE = 10;
const DONE_RECEIPT_VISIBLE = 5;

type Props = {
  restaurantId: string;
  restaurantName: string;
  menuItems: DbItem[];
  menuModifiers: DbModifier[];
  pricingSettings: OrderPricingSettings;
  initialDraftOrders: DraftOrderRow[];
  initialReceipts: PhoneOrderReceiptRow[];
  initialLoadError?: string | null;
};

export function LiveOrdersPanel({
  restaurantId,
  restaurantName,
  menuItems,
  menuModifiers,
  pricingSettings,
  initialDraftOrders,
  initialReceipts,
  initialLoadError = null,
}: Props) {
  const [draftRows, setDraftRows] = useState<DraftOrderRow[]>(() =>
    initialDraftOrders.map(normalizeDraftRow)
  );
  const [receipts, setReceipts] =
    useState<PhoneOrderReceiptRow[]>(initialReceipts);
  const [syncError, setSyncError] = useState<string | null>(initialLoadError);
  const [tab, setTab] = useState<Tab>("new");
  const [selection, setSelection] = useState<OrderDetailSelection | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [ordersReady, setOrdersReady] = useState(
    initialLoadError != null ||
      initialDraftOrders.length > 0 ||
      initialReceipts.length > 0
  );
  const [realtimeUi, setRealtimeUi] = useState<"connecting" | "live" | "degraded">(
    "connecting"
  );

  const { applyAction, pending, errors, clearError, mergeRealtimeRow } =
    useOrderStatusActions(restaurantId, setDraftRows);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const selectedDraftId =
    selection?.kind === "draft" ? selection.order.id : null;

  useEffect(() => {
    if (!selectedDraftId) return;
    const fresh = draftRows.find((o) => o.id === selectedDraftId);
    if (fresh) {
      setSelection((prev) =>
        prev?.kind === "draft" && prev.order.id === selectedDraftId
          ? { kind: "draft", order: fresh }
          : prev
      );
    }
  }, [draftRows, selectedDraftId]);

  const draftsRef = useRef(initialDraftOrders);
  const receiptsRef = useRef(initialReceipts);
  draftsRef.current = initialDraftOrders;
  receiptsRef.current = initialReceipts;

  const serverKey = useMemo(
    () => bootstrapKey(initialDraftOrders, initialReceipts),
    [initialDraftOrders, initialReceipts]
  );

  useLayoutEffect(() => {
    setDraftRows(draftsRef.current.map(normalizeDraftRow));
    setReceipts(receiptsRef.current);
  }, [serverKey]);

  const fetchAll = useCallback(async () => {
    const supabase = getBrowserSupabase();
    const [dRes, rRes] = await Promise.all([
      supabase
        .from("draft_orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("phone_order_receipts")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(150),
    ]);
    const errMsg = dRes.error?.message ?? rRes.error?.message ?? null;
    if (errMsg) {
      setSyncError(formatSupabaseClientError(errMsg));
    } else {
      setSyncError(null);
    }
    if (!dRes.error && Array.isArray(dRes.data)) {
      const fetched = (dRes.data as DraftOrderRow[]).map(normalizeDraftRow);
      const pendingIds = new Set(Object.keys(pendingRef.current));
      setDraftRows((prev) =>
        mergeFetchedDraftOrders(prev, fetched, pendingIds)
      );
    }
    if (!rRes.error && Array.isArray(rRes.data)) {
      setReceipts(rRes.data as PhoneOrderReceiptRow[]);
    }
    setOrdersReady(true);
  }, [restaurantId]);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let cancelled = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let backoffAttempt = 0;
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    const stopPoll = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const startPoll = (ms: number) => {
      stopPoll();
      pollInterval = setInterval(() => {
        void fetchAll();
      }, ms);
    };

    const clearReconnect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const teardownChannel = () => {
      if (activeChannel) {
        void supabase.removeChannel(activeChannel);
        activeChannel = null;
      }
    };

    const attach = () => {
      if (cancelled) return;
      teardownChannel();
      setRealtimeUi("connecting");
      startPoll(6000);

      const ch = supabase
        .channel(`orders-${restaurantId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "draft_orders",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          (payload: RealtimePostgresChangesPayload<DraftOrderRow>) => {
            if (payload.eventType === "INSERT") {
              const row = normalizeDraftRow(payload.new as DraftOrderRow);
              if (row.restaurant_id !== restaurantId) return;
              setDraftRows((prev) =>
                prev.some((o) => o.id === row.id) ? prev : [row, ...prev]
              );
            } else if (payload.eventType === "UPDATE") {
              const row = normalizeDraftRow(payload.new as DraftOrderRow);
              if (row.restaurant_id !== restaurantId) return;
              if (!mergeRealtimeRow(row)) return;
              setDraftRows((prev) =>
                prev.map((o) => (o.id === row.id ? row : o))
              );
            } else if (payload.eventType === "DELETE") {
              const row = payload.old as DraftOrderRow;
              setDraftRows((prev) => prev.filter((o) => o.id !== row.id));
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "phone_order_receipts",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          (payload: RealtimePostgresChangesPayload<PhoneOrderReceiptRow>) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as PhoneOrderReceiptRow;
              setReceipts((prev) => {
                const rest = prev.filter((p) => p.session_id !== row.session_id);
                return [row, ...rest];
              });
            } else if (payload.eventType === "UPDATE") {
              const row = payload.new as PhoneOrderReceiptRow;
              setReceipts((prev) =>
                prev.map((o) => (o.id === row.id ? row : o))
              );
            } else if (payload.eventType === "DELETE") {
              const row = payload.old as PhoneOrderReceiptRow;
              setReceipts((prev) => prev.filter((o) => o.id !== row.id));
            }
          }
        )
        .subscribe((status: string, err?: Error) => {
          if (cancelled) return;
          if (status === "SUBSCRIBED") {
            backoffAttempt = 0;
            setRealtimeUi("live");
            startPoll(28000);
            return;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (process.env.NODE_ENV === "development") {
              console.warn("[LiveOrdersPanel] Realtime:", status, err);
            }
            setRealtimeUi("degraded");
            reportRealtimeDegraded({ restaurantId, restaurantName });
            startPoll(6000);
            void fetchAll();
            teardownChannel();
            backoffAttempt += 1;
            const delay = Math.min(30_000, 1500 * 2 ** (backoffAttempt - 1));
            clearReconnect();
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              attach();
            }, delay);
          }
        });
      activeChannel = ch;
    };

    void fetchAll();
    attach();

    function onVisible() {
      if (document.visibilityState === "visible") {
        void fetchAll();
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      clearReconnect();
      stopPoll();
      teardownChannel();
    };
  }, [restaurantId, restaurantName, fetchAll, mergeRealtimeRow]);

  const newOrders = useMemo(
    () =>
      [...draftRows]
        .filter((o) => normalizeOrderStatus(o.status) === "new")
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ),
    [draftRows]
  );

  const inProgressOrders = useMemo(
    () =>
      [...draftRows]
        .filter((o) => {
          const n = normalizeOrderStatus(o.status);
          return n === "accepted" || n === "in_progress" || n === "ready";
        })
        .sort((a, b) => {
          const byStatus = compareKitchenQueue(a.status, b.status);
          if (byStatus !== 0) return byStatus;
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        }),
    [draftRows]
  );

  const liveCarts = useMemo(
    () =>
      [...draftRows]
        .filter((o) => isVoiceCartStatus(o.status))
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime()
        ),
    [draftRows]
  );

  const terminalOrders = useMemo(
    () =>
      [...draftRows]
        .filter((o) => isTerminalOrderStatus(o.status))
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime()
        ),
    [draftRows]
  );

  const callStripLastUpdated = useMemo(() => {
    if (liveCarts.length > 0) return liveCarts[0]?.updated_at ?? null;
    let latest = 0;
    for (const o of draftRows) {
      const t = new Date(o.updated_at).getTime();
      if (t > latest) latest = t;
    }
    return latest > 0 ? new Date(latest).toISOString() : null;
  }, [liveCarts, draftRows]);

  const receiptArchive = useMemo(() => {
    const terminalSessions = new Set(terminalOrders.map((o) => o.session_id));
    return [...receipts]
      .filter((r) => !terminalSessions.has(r.session_id))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
  }, [receipts, terminalOrders]);

  const visibleDoneDrafts = useMemo(
    () => terminalOrders.slice(0, DONE_DRAFT_VISIBLE),
    [terminalOrders]
  );
  const visibleDoneReceipts = useMemo(
    () => receiptArchive.slice(0, DONE_RECEIPT_VISIBLE),
    [receiptArchive]
  );
  const doneHiddenCount =
    Math.max(0, terminalOrders.length - visibleDoneDrafts.length) +
    Math.max(0, receiptArchive.length - visibleDoneReceipts.length);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  }

  const hasNoOrders =
    newOrders.length === 0 &&
    liveCarts.length === 0 &&
    inProgressOrders.length === 0 &&
    terminalOrders.length === 0 &&
    receiptArchive.length === 0;

  const emptyNew =
    !hasNoOrders &&
    tab === "new" &&
    newOrders.length === 0 &&
    liveCarts.length === 0;
  const emptyInProgress =
    !hasNoOrders && tab === "in_progress" && inProgressOrders.length === 0;
  const emptyDone =
    !hasNoOrders &&
    tab === "done" &&
    terminalOrders.length === 0 &&
    receiptArchive.length === 0;

  const modalPending =
    selection?.kind === "draft" ? pending[selection.order.id] ?? null : null;
  const modalError =
    selection?.kind === "draft" ? errors[selection.order.id] ?? null : null;

  return (
    <>
    <section
      className="kds-orders-canvas kds-panel min-w-0 max-w-full overflow-hidden"
      aria-labelledby="kds-order-panel-heading"
    >
      <h2 id="kds-order-panel-heading" className="sr-only">
        Order queue
      </h2>
      <div className="kds-panel-sticky-head">
        <div className="kds-orders-head">
          <h2
            id="kds-page-heading"
            className="kds-orders-head__title min-w-0 truncate"
            title={RESTAURANT_LIVE_ORDERS_LABEL}
          >
            {RESTAURANT_LIVE_ORDERS_LABEL}
          </h2>
          <div className="kds-orders-head__tools">
            <KdsRealtimeIndicator state={realtimeUi} />
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={refreshing}
              aria-busy={refreshing}
              aria-label={refreshing ? "Refreshing orders" : "Refresh orders"}
              className="kds-thumb-btn inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-elev text-ink transition-colors hover:bg-card disabled:opacity-50"
            >
              <svg
                className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" />
                <path
                  d="M21 3v6h-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {syncError && !hasNoOrders ? (
          <KdsSyncErrorNotice
            onRefresh={() => void onRefresh()}
            refreshing={refreshing}
          />
        ) : null}

        {realtimeUi === "degraded" && !syncError ? (
          <KdsDisconnectedNotice
            onRefresh={() => void onRefresh()}
            refreshing={refreshing}
          />
        ) : null}

        <CallStatusStrip
          compact
          liveCount={liveCarts.length}
          lastUpdatedAt={callStripLastUpdated}
        />

        <div className="kds-order-tabs" role="tablist" aria-label="Order queue">
        <TabButton
          active={tab === "new"}
          onClick={() => setTab("new")}
          label="New"
          count={newOrders.length + liveCarts.length}
          accentWhenActive
        />
        <TabButton
          active={tab === "in_progress"}
          onClick={() => setTab("in_progress")}
          label="In progress"
          count={inProgressOrders.length}
        />
        <TabButton
          active={tab === "done"}
          onClick={() => setTab("done")}
          label="Done"
          count={terminalOrders.length + receiptArchive.length}
        />
        </div>
      </div>

      <div className="kds-order-body">
        {!ordersReady && hasNoOrders && !syncError ? (
          <KdsLoadingPanel label="Loading orders…" rows={0} />
        ) : null}

        {ordersReady && hasNoOrders && syncError ? (
          <KdsEmptyStatePanel
            tone="calm"
            icon="orders"
            title="Couldn't load orders"
            actions={
              <KdsRecoveryButton
                onClick={() => void onRefresh()}
                busy={refreshing}
              />
            }
          >
            Check your connection, then refresh.
          </KdsEmptyStatePanel>
        ) : null}

        {ordersReady && hasNoOrders && !syncError ? (
          <KdsEmptyStatePanel
            tone="calm"
            icon="orders"
            title="No orders yet"
            actions={
              <KdsRecoveryButton
                onClick={() => void onRefresh()}
                busy={refreshing}
              />
            }
          />
        ) : null}

        {tab === "new" && emptyNew && (
          <KdsEmptyStatePanel title="No new orders" tone="tab" />
        )}
        {tab === "in_progress" && emptyInProgress && (
          <KdsEmptyStatePanel title="Nothing in progress" tone="tab" />
        )}
        {tab === "done" && emptyDone && (
          <KdsEmptyStatePanel title="No finished orders yet" tone="done" />
        )}

        {!hasNoOrders && tab === "new" && liveCarts.length > 0 && (
          <ul className="kds-order-list kds-order-list--live mb-4">
            {liveCarts.map((o) => (
              <KitchenOrderCard
                key={o.id}
                order={o}
                pendingAction={null}
                error={null}
                onDismissError={() => {}}
                onAction={() => {}}
                onViewDetails={() => setSelection({ kind: "draft", order: o })}
                menuItems={menuItems}
                menuModifiers={menuModifiers}
                pricingSettings={pricingSettings}
                statusLabel="On the phone"
              />
            ))}
          </ul>
        )}

        {!hasNoOrders && tab === "new" && newOrders.length > 0 && (
          <ul className="kds-order-list">
            {newOrders.map((o) => (
                <KitchenOrderCard
                  key={o.id}
                  order={o}
                  pendingAction={pending[o.id] ?? null}
                  error={errors[o.id] ?? null}
                  onDismissError={() => clearError(o.id)}
                  onAction={(action) => void applyAction(o, action)}
                  onViewDetails={() =>
                    setSelection({ kind: "draft", order: o })
                  }
                  menuItems={menuItems}
                  menuModifiers={menuModifiers}
                  pricingSettings={pricingSettings}
                />
            ))}
          </ul>
        )}

        {!hasNoOrders && tab === "in_progress" && inProgressOrders.length > 0 && (
          <ul className="kds-order-list">
            {inProgressOrders.map((o) => (
                <KitchenOrderCard
                  key={o.id}
                  order={o}
                  pendingAction={pending[o.id] ?? null}
                  error={errors[o.id] ?? null}
                  onDismissError={() => clearError(o.id)}
                  onAction={(action) => void applyAction(o, action)}
                  onViewDetails={() =>
                    setSelection({ kind: "draft", order: o })
                  }
                  menuItems={menuItems}
                  menuModifiers={menuModifiers}
                  pricingSettings={pricingSettings}
                />
            ))}
          </ul>
        )}

        {!hasNoOrders &&
          tab === "done" &&
          (terminalOrders.length > 0 || receiptArchive.length > 0) && (
          <div className="kds-done-history">
            {doneHiddenCount > 0 ? (
              <p className="kds-done-history__more">
                Showing the latest {visibleDoneDrafts.length + visibleDoneReceipts.length}{" "}
                of {terminalOrders.length + receiptArchive.length}.
              </p>
            ) : null}
            {visibleDoneDrafts.length > 0 ? (
              <ul className="kds-order-list kds-order-list--done">
                {visibleDoneDrafts.map((o) => (
                    <KitchenOrderCard
                      key={o.id}
                      order={o}
                      pendingAction={null}
                      error={null}
                      onDismissError={() => {}}
                      onAction={() => {}}
                      onViewDetails={() =>
                        setSelection({ kind: "draft", order: o })
                      }
                      menuItems={menuItems}
                      menuModifiers={menuModifiers}
                      pricingSettings={pricingSettings}
                    />
                ))}
              </ul>
            ) : null}
            {visibleDoneReceipts.length > 0 ? (
              <div className="mt-4 border-t border-line/60 pt-3">
                <h3 className="mb-2 text-xs font-medium text-subtle">
                  Older receipts
                </h3>
                <ul className="kds-order-list kds-order-list--done">
                  {visibleDoneReceipts.map((o) => (
                    <li
                      key={o.id}
                      data-order-status="completed"
                      className="kds-order-card w-full max-w-full min-w-0"
                    >
                      <PickupStatusBadge
                        label="Done"
                        badgeClass="kds-status-badge bg-success/15 text-success"
                      />
                      <CustomerLine
                        name={o.customer_name}
                        phone={o.customer_phone}
                      />
                      <OrderItemsList items={o.items} />
                      <OrderDetailsLink
                        onClick={() =>
                          setSelection({ kind: "receipt", receipt: o })
                        }
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>

    <OrderDetailModal
      open={!!selection}
      selection={selection}
      onClose={() => setSelection(null)}
      restaurantName={restaurantName}
      menuItems={menuItems}
      menuModifiers={menuModifiers}
      pricingSettings={pricingSettings}
      pendingAction={modalPending}
      actionError={modalError}
      onDismissError={
        selection?.kind === "draft"
          ? () => clearError(selection.order.id)
          : undefined
      }
      onAction={
        selection?.kind === "draft"
          ? (action) => void applyAction(selection.order, action)
          : undefined
      }
    />
    </>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
  accentWhenActive,
  successWhenActive,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  accentWhenActive?: boolean;
  successWhenActive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      aria-label={`${label}, ${count} orders`}
      className={cn(
        "kds-order-tab kds-thumb-btn relative min-h-12 min-w-0 px-3 py-2.5 text-xs font-medium transition-colors sm:text-sm lg:min-w-[7rem]",
        active ? "text-ink" : "text-muted hover:text-ink/80"
      )}
    >
      {label}
      <span
        className={cn(
          "kds-order-tab__count ml-1 rounded-md px-1 py-0.5 text-micro font-semibold tabular-nums",
          active && accentWhenActive && "bg-accent-soft text-accent",
          active && successWhenActive && "bg-success/20 text-emerald-900",
          active && !accentWhenActive && !successWhenActive && "bg-elev text-subtle",
          !active && "bg-elev text-subtle"
        )}
      >
        {count}
      </span>
      {active && (
        <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-accent sm:inset-x-2" />
      )}
    </button>
  );
}
