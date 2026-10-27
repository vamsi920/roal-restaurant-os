"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { AgentCallOutcome, AgentCallStatus } from "@/lib/agent-calls/types";
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
  buildOrderCallEvidence,
  indexOrderCallEvidence,
  type AgentCallEventEvidenceRow,
  type OrderCallEvidence,
} from "@/lib/live-orders/call-evidence";
import {
  classifyKdsQueueLane,
  isKdsStuckOrder,
  minutesSinceUpdated,
} from "@/lib/orders/kds-queue-lane";
import { KdsQueueSection } from "./KdsQueueSection";
import { KitchenOrderCard } from "./KitchenOrderCard";
import {
  OrderDetailModal,
  type OrderDetailSelection,
} from "./OrderDetailModal";
import { formatTicketClock } from "./order-card-parts";
import { useOrderStatusActions } from "./useOrderStatusActions";
import { mergeFetchedDraftOrders } from "@/lib/orders/merge-fetched-orders";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";
import { LEGACY_CONFIRMED_STATUS } from "@/lib/order-status";
import Link from "next/link";
import { AlertTriangle, ChefHat, PhoneCall, Receipt, WifiOff } from "lucide-react";
import { Badge, EmptyState, IconTile, PageHeader, Panel } from "@/components/ui";
import {
  LoadingRows,
  Notice,
  RealtimeBadge,
  RefreshButton,
} from "@/components/live-orders/workspace-ui";
import { parseOrderLineItems } from "@/lib/orders/line-items";

function normalizeDraftRow(row: DraftOrderRow): DraftOrderRow {
  const status =
    row.status === LEGACY_CONFIRMED_STATUS ? "new" : row.status;
  return {
    ...row,
    status,
    fulfillment_type: row.fulfillment_type ?? null,
    delivery_address: row.delivery_address ?? null,
    delivery_instructions: row.delivery_instructions ?? null,
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

/** Board = the three live lanes; done = finished tickets and receipts. */
type Tab = "board" | "done";
type Lane = "new" | "preparing" | "ready";

type RealtimeAgentCallEventRow = AgentCallEventEvidenceRow & {
  restaurant_id: string;
  caller_phone: string | null;
  status: string;
  updated_at?: string | null;
};

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

const AGENT_CALL_STATUSES = new Set<AgentCallStatus>(["active", "ended"]);
const AGENT_CALL_OUTCOMES = new Set<AgentCallOutcome>([
  "in_progress",
  "order_completed",
  "abandoned",
  "canceled",
  "no_order",
  "unknown",
]);

function safeAgentCallStatus(value: string | null | undefined): AgentCallStatus {
  return AGENT_CALL_STATUSES.has(value as AgentCallStatus)
    ? (value as AgentCallStatus)
    : "active";
}

function safeAgentCallOutcome(value: string | null | undefined): AgentCallOutcome {
  return AGENT_CALL_OUTCOMES.has(value as AgentCallOutcome)
    ? (value as AgentCallOutcome)
    : "unknown";
}

function realtimeCallRowFromEvent(
  row: RealtimeAgentCallEventRow
): CommandCenterCallRow | null {
  const sessionId = row.session_id?.trim();
  if (!sessionId) return null;
  const metadata = row.transcript_metadata ?? {};
  const handoffSignals = Array.isArray(metadata.handoff_signals)
    ? metadata.handoff_signals.filter(
        (signal): signal is string => typeof signal === "string" && signal.trim().length > 0
      )
    : [];

  return {
    sessionId,
    conversationId: row.conversation_id?.trim() || sessionId,
    callerPhone: row.caller_phone?.trim() || null,
    status: safeAgentCallStatus(row.status),
    outcome: safeAgentCallOutcome(row.outcome),
    startedAt: row.started_at || row.updated_at || new Date().toISOString(),
    endedAt: row.ended_at ?? null,
    lastActivityAt: row.updated_at || row.ended_at || row.started_at || new Date().toISOString(),
    lineCount: 0,
    toolErrorCount: 0,
    handoffSignals,
  };
}

const DONE_DRAFT_VISIBLE = 10;
const DONE_RECEIPT_VISIBLE = 5;

type Props = {
  restaurantId: string;
  restaurantName: string;
  /** Owner-facing host name ("Addy"); used in header and empty copy. */
  hostName?: string;
  /** Optional callout under the page header (e.g. launch readiness). */
  notice?: ReactNode;
  menuItems: DbItem[];
  menuModifiers: DbModifier[];
  pricingSettings: OrderPricingSettings;
  initialDraftOrders: DraftOrderRow[];
  initialReceipts: PhoneOrderReceiptRow[];
  initialLoadError?: string | null;
  initialActiveCalls?: CommandCenterCallRow[];
  initialCallEvidenceBySession?: Record<string, OrderCallEvidence>;
};

export function LiveOrdersPanel({
  restaurantId,
  restaurantName,
  hostName = "your host",
  notice = null,
  menuItems,
  menuModifiers,
  pricingSettings,
  initialDraftOrders,
  initialReceipts,
  initialLoadError = null,
  initialActiveCalls = [],
  initialCallEvidenceBySession = {},
}: Props) {
  const [draftRows, setDraftRows] = useState<DraftOrderRow[]>(() =>
    initialDraftOrders.map(normalizeDraftRow)
  );
  const [receipts, setReceipts] =
    useState<PhoneOrderReceiptRow[]>(initialReceipts);
  const [syncError, setSyncError] = useState<string | null>(initialLoadError);
  const [tab, setTab] = useState<Tab>("board");
  const [lane, setLane] = useState<Lane>("new");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selection, setSelection] = useState<OrderDetailSelection | null>(null);
  const [callEvidenceBySession, setCallEvidenceBySession] = useState<
    Record<string, OrderCallEvidence>
  >(initialCallEvidenceBySession);
  const [activeCalls, setActiveCalls] =
    useState<CommandCenterCallRow[]>(initialActiveCalls);
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
    setCallEvidenceBySession(initialCallEvidenceBySession);
    setActiveCalls(initialActiveCalls);
  }, [serverKey, initialCallEvidenceBySession, initialActiveCalls]);

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
    if (!dRes.error || !rRes.error) {
      const sessionIds = [
        ...(((dRes.data ?? []) as DraftOrderRow[]).map((row) => row.session_id)),
        ...(((rRes.data ?? []) as PhoneOrderReceiptRow[]).map((row) => row.session_id)),
      ]
        .map((id) => id?.trim())
        .filter((id): id is string => Boolean(id));
      if (sessionIds.length > 0) {
        const evidenceRes = await supabase
          .from("agent_call_events")
          .select(
            "session_id, conversation_id, outcome, started_at, ended_at, transcript_metadata"
          )
          .eq("restaurant_id", restaurantId)
          .in("session_id", [...new Set(sessionIds)])
          .order("updated_at", { ascending: false })
          .limit(sessionIds.length);
        if (!evidenceRes.error && Array.isArray(evidenceRes.data)) {
          setCallEvidenceBySession(
            indexOrderCallEvidence(
              evidenceRes.data
                .map((row) =>
                  buildOrderCallEvidence(row as AgentCallEventEvidenceRow)
                )
                .filter((row): row is OrderCallEvidence => row != null)
            )
          );
        }
      }
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
              if (row.restaurant_id !== restaurantId) return;
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
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "agent_call_events",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          (payload: RealtimePostgresChangesPayload<RealtimeAgentCallEventRow>) => {
            if (payload.eventType === "DELETE") {
              const row = payload.old as Partial<RealtimeAgentCallEventRow>;
              const sessionId = row.session_id?.trim();
              if (!sessionId) return;
              setActiveCalls((prev) => prev.filter((call) => call.sessionId !== sessionId));
              setCallEvidenceBySession((prev) => {
                const next = { ...prev };
                delete next[sessionId];
                return next;
              });
              return;
            }

            const row = payload.new as RealtimeAgentCallEventRow;
            if (row.restaurant_id !== restaurantId) return;

            const evidence = buildOrderCallEvidence(row);
            if (evidence) {
              setCallEvidenceBySession((prev) => ({
                ...prev,
                [evidence.sessionId]: evidence,
              }));
            }

            const call = realtimeCallRowFromEvent(row);
            if (!call) return;
            const shouldShowActive =
              call.status === "active" || call.outcome === "in_progress";
            setActiveCalls((prev) => {
              const without = prev.filter((existing) => existing.sessionId !== call.sessionId);
              return shouldShowActive ? [call, ...without].slice(0, 12) : without;
            });
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

  const modalPending =
    selection?.kind === "draft" ? pending[selection.order.id] ?? null : null;
  const modalError =
    selection?.kind === "draft" ? errors[selection.order.id] ?? null : null;


  const preparingOrders = kitchenOrders.filter(
    (o) => normalizeOrderStatus(o.status) !== "ready"
  );
  const readyOrders = kitchenOrders.filter(
    (o) => normalizeOrderStatus(o.status) === "ready"
  );
  const newLaneCount = liveCarts.length + incomingOrders.length;
  const doneCount = terminalOrders.length + receiptArchive.length;
  const showLoading = !ordersReady && hasNoOrders && !syncError;

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
        now={now}
      />
    );
  }

  /** Mid-call carts: read-only until the call ends and the ticket is confirmed. */
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
        now={now}
      />
    );
  }

  const laneItems: Array<{ key: Lane; label: string; count: number }> = [
    { key: "new", label: "New", count: newLaneCount },
    { key: "preparing", label: "Preparing", count: preparingOrders.length },
    { key: "ready", label: "Ready", count: readyOrders.length },
  ];

  return (
    <>
      <PageHeader
        title={RESTAURANT_LIVE_ORDERS_LABEL}
        subtitle={`Tickets from ${hostName} land here the moment a call ends.`}
        actions={
          <>
            <RealtimeBadge state={realtimeUi} />
            <div className="seg" role="tablist" aria-label="Kitchen views">
              <TabButton
                id="kds-tab-board"
                panelId="kds-tabpanel-board"
                active={tab === "board"}
                onClick={() => setTab("board")}
                label="Board"
                count={newLaneCount + kitchenOrders.length}
              />
              <TabButton
                id="kds-tab-done"
                panelId="kds-tabpanel-done"
                active={tab === "done"}
                onClick={() => setTab("done")}
                label="Done"
                count={doneCount}
              />
            </div>
            <RefreshButton onClick={() => void onRefresh()} busy={refreshing} label="Refresh orders" />
          </>
        }
      />

      <section
        className="kds-board min-w-0 max-w-full space-y-4"
        aria-labelledby="kds-order-panel-heading"
      >
        <h2 id="kds-order-panel-heading" className="sr-only">
          Order queue
        </h2>

        {notice}

        <LiveCallIndicator
          initialActiveCalls={activeCalls}
          liveCarts={liveCarts}
          draftRows={draftRows}
          hostName={hostName}
        />

        {syncError && !hasNoOrders ? (
          <Notice
            tone="bad"
            title="Couldn't refresh orders."
            action={<RefreshButton onClick={() => void onRefresh()} busy={refreshing} showLabel label="Retry" />}
          >
            Tickets below may be out of date.
          </Notice>
        ) : null}

        {realtimeUi === "degraded" && !syncError ? (
          <Notice
            tone="warn"
            title={
              <span className="inline-flex items-center gap-1.5">
                <WifiOff size={14} aria-hidden /> Live updates paused.
              </span>
            }
            action={<RefreshButton onClick={() => void onRefresh()} busy={refreshing} showLabel label="Refresh" />}
          >
            Still checking for new tickets every few seconds.
          </Notice>
        ) : null}

        {!hasNoOrders && stuckCount > 0 && tab === "board" ? (
          <Notice
            tone="bad"
            role="alert"
            title={
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle size={14} aria-hidden />
                {stuckCount} ticket{stuckCount === 1 ? "" : "s"} idle 20+ minutes.
              </span>
            }
          >
            They are outlined in red below.
          </Notice>
        ) : null}

        <div
          role="tabpanel"
          id={tab === "board" ? "kds-tabpanel-board" : "kds-tabpanel-done"}
          aria-labelledby={tab === "board" ? "kds-tab-board" : "kds-tab-done"}
          aria-busy={showLoading}
          className="min-w-0"
        >
          {showLoading ? (
            <Panel flush>
              <LoadingRows label="Loading phone orders…" rows={3} />
            </Panel>
          ) : null}

          {ordersReady && hasNoOrders && syncError ? (
            <Panel>
              <EmptyState
                icon={WifiOff}
                title="Couldn't load orders"
                body={`${syncError}. Check your connection, then refresh.`}
                action={
                  <RefreshButton onClick={() => void onRefresh()} busy={refreshing} showLabel label="Refresh" />
                }
              />
            </Panel>
          ) : null}

          {ordersReady && hasNoOrders && !syncError ? (
            <Panel>
              <EmptyState
                icon={ChefHat}
                title="No phone orders yet"
                body={`Tickets show up here the moment ${hostName} finishes taking an order. Keep this screen open on the kitchen tablet.`}
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link href={`/dashboard/restaurants/${restaurantId}/agent#test-call`} className="btn-primary btn-sm">
                      <PhoneCall size={14} aria-hidden />
                      Place a test order
                    </Link>
                    <RefreshButton onClick={() => void onRefresh()} busy={refreshing} showLabel label="Refresh" />
                  </div>
                }
              />
            </Panel>
          ) : null}

          {!hasNoOrders && tab === "board" ? (
            <>
              <div className="kds-board__picker mb-3">
                <div className="seg flex w-full" role="group" aria-label="Show lane">
                  {laneItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={lane === item.key}
                      onClick={() => setLane(item.key)}
                      className="min-h-10 flex-1 justify-center gap-1.5"
                    >
                      {item.label}
                      <span className="tabular-nums text-subtle">{item.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="kds-board__lanes">
                <KdsQueueSection
                  id="kds-lane-new"
                  title="New"
                  tone="new"
                  count={newLaneCount}
                  active={lane === "new"}
                  emptyTitle="No new tickets"
                  emptyBody="Confirmed phone orders land here first."
                >
                  {buildingCarts.map((o) => renderPhoneCart(o))}
                  {liveCallCarts.map((o) => renderPhoneCart(o))}
                  {incomingOrders.map((o) => renderDraftCard(o))}
                </KdsQueueSection>

                <KdsQueueSection
                  id="kds-lane-preparing"
                  title="Preparing"
                  tone="preparing"
                  count={preparingOrders.length}
                  active={lane === "preparing"}
                  emptyTitle="Nothing on the line"
                  emptyBody="Accepted tickets move here."
                >
                  {preparingOrders.map((o) => renderDraftCard(o))}
                </KdsQueueSection>

                <KdsQueueSection
                  id="kds-lane-ready"
                  title="Ready"
                  tone="ready"
                  count={readyOrders.length}
                  active={lane === "ready"}
                  emptyTitle="Nothing waiting"
                  emptyBody="Orders ready for pickup show here."
                >
                  {readyOrders.map((o) => renderDraftCard(o))}
                </KdsQueueSection>
              </div>
            </>
          ) : null}

          {!hasNoOrders && tab === "done" ? (
            doneCount === 0 ? (
              <Panel>
                <EmptyState
                  icon={Receipt}
                  title="No finished orders yet"
                  body="Picked-up and canceled tickets move here."
                />
              </Panel>
            ) : (
              <div className="space-y-4">
                {doneHiddenCount > 0 ? (
                  <p className="text-[12.5px] text-subtle" role="status">
                    Showing the latest {visibleDoneDrafts.length + visibleDoneReceipts.length} of {doneCount}.
                    Full history lives in Calls &amp; Orders.
                  </p>
                ) : null}
                {visibleDoneDrafts.length > 0 ? (
                  <ul
                    className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                    aria-label="Finished tickets"
                  >
                    {visibleDoneDrafts.map((o) => (
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
                        queueLane="terminal"
                      />
                    ))}
                  </ul>
                ) : null}
                {visibleDoneReceipts.length > 0 ? (
                  <Panel
                    flush
                    title={`Receipts without a ticket · ${visibleDoneReceipts.length}`}
                  >
                    <ul>
                      {visibleDoneReceipts.map((o) => {
                        const lines = parseOrderLineItems(o.items);
                        return (
                          <li key={o.id} data-order-status="completed" className="list-row">
                            <IconTile icon={Receipt} color="green" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-semibold text-ink">
                                {o.customer_name?.trim() || o.customer_phone || "Guest"}
                              </p>
                              <p className="truncate text-[12.5px] text-subtle">
                                {lines.length > 0
                                  ? lines.map((l) => `${l.quantity}× ${l.name}`).join(", ")
                                  : "No items"}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="hidden text-[12.5px] tabular-nums text-subtle sm:inline">
                                {formatTicketClock(o.created_at)}
                              </span>
                              <Badge tone="ok">Receipt</Badge>
                              <button
                                type="button"
                                className="btn-ghost btn-sm"
                                onClick={() => setSelection({ kind: "receipt", receipt: o })}
                              >
                                Details
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </Panel>
                ) : null}
              </div>
            )
          ) : null}
        </div>
      </section>

      <OrderDetailModal
        open={!!selection}
        selection={selection}
        callEvidence={
          selection
            ? callEvidenceBySession[
                selection.kind === "draft"
                  ? selection.order.session_id
                  : selection.receipt.session_id
              ] ?? null
            : null
        }
        onClose={() => setSelection(null)}
        restaurantName={restaurantName}
        menuItems={menuItems}
        menuModifiers={menuModifiers}
        pricingSettings={pricingSettings}
        pendingAction={modalPending}
        actionError={modalError}
        onDismissError={
          selection?.kind === "draft" ? () => clearError(selection.order.id) : undefined
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
}: {
  id: string;
  panelId: string;
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
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
      className={cn("min-h-8 gap-1.5", active && "is-active")}
    >
      {label}
      <span className="tabular-nums text-subtle">{count}</span>
    </button>
  );
}
