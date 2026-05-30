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
import { LiveCallIndicator } from "./LiveCallIndicator";
import type { CommandCenterCallRow } from "@/lib/command-center/types";
import {
  classifyKdsQueueLane,
  isKdsStuckOrder,
  minutesSinceUpdated,
} from "@/lib/orders/kds-queue-lane";
import { KdsQueueSection } from "./KdsQueueSection";
import { KdsQueueSummary, type KdsQueueSummaryChip } from "./KdsQueueSummary";
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

type Tab = "incoming" | "kitchen" | "done";

function sortStuckFirst(orders: DraftOrderRow[], now: Date): DraftOrderRow[] {
  return [...orders].sort((a, b) => {
    const aStuck = isKdsStuckOrder(a, { now });
    const bStuck = isKdsStuckOrder(b, { now });
    if (aStuck !== bStuck) return aStuck ? -1 : 1;
    return (
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  });
}

function cardStuckProps(order: DraftOrderRow, now: Date) {
  const stuck = isKdsStuckOrder(order, { now });
  return {
    queueLane: classifyKdsQueueLane(order),
    stuckMinutes: stuck ? minutesSinceUpdated(order.updated_at, now) : undefined,
  };
}

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
  initialActiveCalls?: CommandCenterCallRow[];
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
  initialActiveCalls = [],
}: Props) {
  const [draftRows, setDraftRows] = useState<DraftOrderRow[]>(() =>
    initialDraftOrders.map(normalizeDraftRow)
  );
  const [receipts, setReceipts] =
    useState<PhoneOrderReceiptRow[]>(initialReceipts);
  const [syncError, setSyncError] = useState<string | null>(initialLoadError);
  const [tab, setTab] = useState<Tab>("incoming");
  const [nowMs, setNowMs] = useState(() => Date.now());
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

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const now = useMemo(() => new Date(nowMs), [nowMs]);

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
      sortStuckFirst(
        draftRows.filter((o) => isVoiceCartStatus(o.status)),
        now
      ),
    [draftRows, now]
  );

  const { liveCallCarts, buildingCarts } = useMemo(() => {
    const liveCall: DraftOrderRow[] = [];
    const building: DraftOrderRow[] = [];
    for (const order of liveCarts) {
      if (classifyKdsQueueLane(order) === "building") building.push(order);
      else liveCall.push(order);
    }
    return { liveCallCarts: liveCall, buildingCarts: building };
  }, [liveCarts]);

  const incomingOrders = useMemo(
    () => sortStuckFirst(newOrders, now),
    [newOrders, now]
  );

  const kitchenOrders = useMemo(
    () => sortStuckFirst(inProgressOrders, now),
    [inProgressOrders, now]
  );

  const stuckCount = useMemo(
    () =>
      draftRows.filter(
        (o) =>
          !isTerminalOrderStatus(o.status) && isKdsStuckOrder(o, { now })
      ).length,
    [draftRows, now]
  );

  const summaryChips = useMemo((): KdsQueueSummaryChip[] => {
    return [
      {
        id: "live",
        label: "On phone",
        count: liveCarts.length,
        tone: "live",
      },
      {
        id: "building",
        label: "Building",
        count: buildingCarts.length,
        tone: "live",
      },
      {
        id: "new",
        label: "Confirmed",
        count: newOrders.length,
        tone: "ticket",
      },
      {
        id: "kitchen",
        label: "Kitchen",
        count: inProgressOrders.length,
        tone: "kitchen",
      },
      { id: "stuck", label: "Stuck", count: stuckCount, tone: "stuck" },
    ];
  }, [
    liveCarts.length,
    buildingCarts.length,
    newOrders.length,
    inProgressOrders.length,
    stuckCount,
  ]);

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

  const emptyIncoming =
    !hasNoOrders &&
    tab === "incoming" &&
    newOrders.length === 0 &&
    liveCarts.length === 0;
  const emptyKitchen =
    !hasNoOrders && tab === "kitchen" && inProgressOrders.length === 0;
  const emptyDone =
    !hasNoOrders &&
    tab === "done" &&
    terminalOrders.length === 0 &&
    receiptArchive.length === 0;

  const modalPending =
    selection?.kind === "draft" ? pending[selection.order.id] ?? null : null;
  const modalError =
    selection?.kind === "draft" ? errors[selection.order.id] ?? null : null;

  const tabPanelId =
    tab === "incoming"
      ? "kds-tabpanel-incoming"
      : tab === "kitchen"
        ? "kds-tabpanel-kitchen"
        : "kds-tabpanel-done";

  function renderDraftCard(order: DraftOrderRow) {
    const stuckProps = cardStuckProps(order, now);
    return (
      <KitchenOrderCard
        key={order.id}
        order={order}
        pendingAction={pending[order.id] ?? null}
        error={errors[order.id] ?? null}
        onDismissError={() => clearError(order.id)}
        onAction={(action) => void applyAction(order, action)}
        onViewDetails={() => setSelection({ kind: "draft", order })}
        menuItems={menuItems}
        menuModifiers={menuModifiers}
        pricingSettings={pricingSettings}
        queueLane={stuckProps.queueLane}
        stuckMinutes={stuckProps.stuckMinutes}
      />
    );
  }

  function renderPhoneCart(order: DraftOrderRow) {
    const stuckProps = cardStuckProps(order, now);
    return (
      <KitchenOrderCard
        key={order.id}
        order={order}
        pendingAction={null}
        error={null}
        onDismissError={() => {}}
        onAction={() => {}}
        onViewDetails={() => setSelection({ kind: "draft", order })}
        menuItems={menuItems}
        menuModifiers={menuModifiers}
        pricingSettings={pricingSettings}
        queueLane={stuckProps.queueLane}
        stuckMinutes={stuckProps.stuckMinutes}
      />
    );
  }

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
            title="Order queue"
          >
            Queue
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

        <LiveCallIndicator
          initialActiveCalls={initialActiveCalls}
          liveCarts={liveCarts}
          draftRows={draftRows}
        />

        <KdsQueueSummary chips={summaryChips} />

        <div className="kds-order-tabs" role="tablist" aria-label="Order queue views">
        <TabButton
          id="kds-tab-incoming"
          panelId="kds-tabpanel-incoming"
          active={tab === "incoming"}
          onClick={() => setTab("incoming")}
          label="Incoming"
          count={newOrders.length + liveCarts.length}
          accentWhenActive
        />
        <TabButton
          id="kds-tab-kitchen"
          panelId="kds-tabpanel-kitchen"
          active={tab === "kitchen"}
          onClick={() => setTab("kitchen")}
          label="Kitchen"
          count={inProgressOrders.length}
        />
        <TabButton
          id="kds-tab-done"
          panelId="kds-tabpanel-done"
          active={tab === "done"}
          onClick={() => setTab("done")}
          label="Done"
          count={terminalOrders.length + receiptArchive.length}
          successWhenActive
        />
        </div>
      </div>

      <div
        className="kds-order-body"
        role="tabpanel"
        id={tabPanelId}
        aria-labelledby={
          tab === "incoming"
            ? "kds-tab-incoming"
            : tab === "kitchen"
              ? "kds-tab-kitchen"
              : "kds-tab-done"
        }
        aria-busy={!ordersReady && hasNoOrders && !syncError}
      >
        {!ordersReady && hasNoOrders && !syncError ? (
          <KdsLoadingPanel label="Loading phone orders…" rows={3} />
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
            {syncError}. Check your connection, then refresh.
          </KdsEmptyStatePanel>
        ) : null}

        {ordersReady && hasNoOrders && !syncError ? (
          <KdsEmptyStatePanel
            tone="calm"
            icon="orders"
            title="No phone orders yet"
            actions={
              <KdsRecoveryButton
                onClick={() => void onRefresh()}
                busy={refreshing}
              />
            }
          >
            {RESTAURANT_LIVE_ORDERS_LABEL} fills when a guest calls and places an
            order.
          </KdsEmptyStatePanel>
        ) : null}

        {tab === "incoming" && emptyIncoming && (
          <KdsEmptyStatePanel title="No incoming activity" tone="tab">
            Live calls and confirmed tickets appear here.
          </KdsEmptyStatePanel>
        )}
        {tab === "kitchen" && emptyKitchen && (
          <KdsEmptyStatePanel title="Kitchen clear" tone="tab">
            Accepted and in-progress tickets show here.
          </KdsEmptyStatePanel>
        )}
        {tab === "done" && emptyDone && (
          <KdsEmptyStatePanel title="No finished orders yet" tone="done">
            Completed and canceled tickets move here.
          </KdsEmptyStatePanel>
        )}

        {!hasNoOrders && stuckCount > 0 && tab !== "done" ? (
          <p
            className="kds-stuck-banner mx-3 mt-3 rounded-lg border border-danger/25 bg-danger/[0.06] px-3 py-2 text-sm text-danger sm:mx-4"
            role="alert"
          >
            {stuckCount} order{stuckCount === 1 ? "" : "s"} idle 20+ minutes — highlighted
            below.
          </p>
        ) : null}

        {!hasNoOrders && tab === "incoming" && (
          <div className="kds-queue-panels space-y-5 p-3 sm:p-4">
            {liveCallCarts.length > 0 ? (
              <KdsQueueSection
                id="kds-section-live-call"
                title="Live call"
                description="Guest is on the line; cart may still be empty."
                variant="live"
              >
                <ul className="kds-order-list kds-order-list--live">
                  {liveCallCarts.map((o) => renderPhoneCart(o))}
                </ul>
              </KdsQueueSection>
            ) : null}

            {buildingCarts.length > 0 ? (
              <KdsQueueSection
                id="kds-section-building"
                title="Building order"
                description="Items are being added during the call."
                variant="live"
              >
                <ul className="kds-order-list kds-order-list--live">
                  {buildingCarts.map((o) => renderPhoneCart(o))}
                </ul>
              </KdsQueueSection>
            ) : null}

            {incomingOrders.length > 0 ? (
              <KdsQueueSection
                id="kds-section-confirmed"
                title="Confirmed tickets"
                description="Call finished — accept to start the kitchen queue."
                variant="ticket"
              >
                <ul className="kds-order-list">
                  {incomingOrders.map((o) => renderDraftCard(o))}
                </ul>
              </KdsQueueSection>
            ) : null}
          </div>
        )}

        {!hasNoOrders && tab === "kitchen" && kitchenOrders.length > 0 && (
          <KdsQueueSection
            id="kds-section-kitchen"
            title="Kitchen line"
            description="Accepted through ready for pickup."
            variant="kitchen"
          >
            <ul className="kds-order-list px-3 pb-4 sm:px-4">
              {kitchenOrders.map((o) => renderDraftCard(o))}
            </ul>
          </KdsQueueSection>
        )}

        {!hasNoOrders &&
          tab === "done" &&
          (terminalOrders.length > 0 || receiptArchive.length > 0) && (
          <div className="kds-done-history">
            {doneHiddenCount > 0 ? (
              <p className="kds-done-history__more" role="status">
                Showing the latest {visibleDoneDrafts.length + visibleDoneReceipts.length}{" "}
                of {terminalOrders.length + receiptArchive.length}.
              </p>
            ) : null}
            {visibleDoneDrafts.length > 0 ? (
              <KdsQueueSection
                id="kds-section-done"
                title="Finished tickets"
                variant="done"
              >
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
                      queueLane="terminal"
                    />
                  ))}
                </ul>
              </KdsQueueSection>
            ) : null}
            {visibleDoneReceipts.length > 0 ? (
              <details className="kds-done-receipts mx-3 mb-4 sm:mx-4">
                <summary className="cursor-pointer text-xs font-medium text-subtle">
                  {visibleDoneReceipts.length} receipt
                  {visibleDoneReceipts.length === 1 ? "" : "s"} without ticket
                </summary>
                <ul className="kds-order-list kds-order-list--done mt-3">
                  {visibleDoneReceipts.map((o) => (
                    <li
                      key={o.id}
                      data-order-status="completed"
                      className="kds-order-card kds-order-card--receipt w-full max-w-full min-w-0"
                    >
                      <PickupStatusBadge
                        label="Receipt"
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
              </details>
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
  id,
  panelId,
  active,
  onClick,
  label,
  count,
  accentWhenActive,
  successWhenActive,
}: {
  id: string;
  panelId: string;
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
      id={id}
      onClick={onClick}
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
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
