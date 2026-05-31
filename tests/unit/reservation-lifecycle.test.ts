import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCallHistoryRows } from "@/lib/call-history/build-call-history-rows";
import {
  buildReservationBySessionMap,
  normalizeReservationStatus,
  reservationNextOwnerAction,
  reservationStatusLabel,
} from "@/lib/restaurant-reservations/schema";
import { simulateHarnessTool } from "@/lib/voice-agent/test-harness/simulate-tool";
import { RESTAURANT_ID } from "../fixtures/menu";

const REPO = join(import.meta.dirname, "../..");
const MIGRATION = join(
  REPO,
  "supabase/migrations/034_reservation_request_contacted_status.sql"
);
const PANEL = join(REPO, "components/call-history/RestaurantCallHistoryPanel.tsx");
const ACTIONS = join(
  REPO,
  "app/dashboard/restaurants/[id]/calls/actions.ts"
);

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/context-server", () => ({
  requireRestaurantAccess: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { createServerSupabase } from "@/lib/supabase/server";
import { updateReservationRequestStatusAction } from "@/app/dashboard/restaurants/[id]/calls/actions";

describe("reservation status schema", () => {
  it("migration adds contacted and member update policy", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toMatch(/'contacted'/);
    expect(sql).toMatch(/restaurant_reservation_requests_status_check/);
    expect(sql).toMatch(/update_member/);
  });

  it("maps legacy closed to canceled for display", () => {
    expect(normalizeReservationStatus("closed")).toBe("canceled");
    expect(reservationStatusLabel("canceled")).toBe("Closed");
    expect(reservationStatusLabel("contacted")).toBe("Contacted");
  });

  it("derives next owner actions per lifecycle stage", () => {
    expect(reservationNextOwnerAction("requested")).toMatch(/Contact guest/i);
    expect(reservationNextOwnerAction("contacted")).toMatch(/Confirm table or decline/i);
    expect(reservationNextOwnerAction("confirmed")).toMatch(/no further action/i);
  });
});

describe("updateReservationRequestStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockSupabaseUpdate(result: { id: string; status: string } | null) {
    const single = vi.fn(async () => ({ data: result, error: null }));
    const select = vi.fn(() => ({ single }));
    const eqRestaurant = vi.fn(() => ({ select }));
    const eqId = vi.fn(() => ({ eq: eqRestaurant }));
    const update = vi.fn(() => ({ eq: eqId }));
    vi.mocked(createServerSupabase).mockResolvedValue({
      from: vi.fn(() => ({ update })),
    } as never);
    return { update, eqId, eqRestaurant };
  }

  it("is tenant-scoped and supports contacted, confirmed, declined, canceled", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue({
      errorResponse: null,
      restaurant: { id: RESTAURANT_ID },
    } as never);
    const chain = mockSupabaseUpdate({
      id: "req-1",
      status: "contacted",
    });

    const result = await updateReservationRequestStatusAction(
      RESTAURANT_ID,
      "req-1",
      "contacted"
    );

    expect(result).toEqual({ ok: true, id: "req-1", status: "contacted" });
    expect(chain.eqId).toHaveBeenCalledWith("id", "req-1");
    expect(chain.eqRestaurant).toHaveBeenCalledWith("restaurant_id", RESTAURANT_ID);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "contacted" })
    );
  });

  it("mark contacted does not set confirmed status", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue({
      errorResponse: null,
    } as never);
    mockSupabaseUpdate({ id: "req-2", status: "contacted" });

    const result = await updateReservationRequestStatusAction(
      RESTAURANT_ID,
      "req-2",
      "contacted"
    );

    expect(result.status).toBe("contacted");
    expect(result.status).not.toBe("confirmed");
  });

  it("rejects unsupported status values", async () => {
    await expect(
      updateReservationRequestStatusAction(
        RESTAURANT_ID,
        "req-3",
        "requested" as never
      )
    ).rejects.toThrow(/Unsupported reservation status/i);
  });
});

describe("call history reservation linking", () => {
  it("classifies reservation sessions with linked request status", () => {
    const reservationBySession = buildReservationBySessionMap([
      { sessionId: "reservation-call", status: "contacted" },
    ]);
    const rows = buildCallHistoryRows({
      sessions: [
        {
          restaurantId: RESTAURANT_ID,
          sessionId: "reservation-call",
          conversationId: "reservation-call",
          agentId: "agent_1",
          callerPhone: "+15551234567",
          status: "ended",
          outcome: "no_order",
          startedAt: "2026-05-30T17:00:00.000Z",
          endedAt: "2026-05-30T17:05:00.000Z",
          transcriptMetadata: {},
          source: "derived",
        },
      ],
      drafts: [],
      receipts: [],
      reservationSessionIds: ["reservation-call"],
      reservationBySession,
    });

    expect(rows[0]).toMatchObject({
      intent: "reservation",
      ownerActionLabel: reservationNextOwnerAction("contacted"),
      isActionable: true,
    });
  });

  it("marks confirmed reservations as non-actionable in call history", () => {
    const reservationBySession = buildReservationBySessionMap([
      { sessionId: "done-res", status: "confirmed" },
    ]);
    const rows = buildCallHistoryRows({
      sessions: [
        {
          restaurantId: RESTAURANT_ID,
          sessionId: "done-res",
          conversationId: "done-res",
          agentId: "agent_1",
          callerPhone: null,
          status: "ended",
          outcome: "no_order",
          startedAt: "2026-05-30T17:00:00.000Z",
          endedAt: "2026-05-30T17:05:00.000Z",
          transcriptMetadata: {},
          source: "derived",
        },
      ],
      drafts: [],
      receipts: [],
      reservationSessionIds: ["done-res"],
      reservationBySession,
    });

    expect(rows[0]?.isActionable).toBe(false);
    expect(rows[0]?.ownerActionLabel).toMatch(/confirmed/i);
  });
});

describe("Calls/Follow-ups reservation inbox UI", () => {
  it("shows all recent reservation statuses with mobile card actions", () => {
    const src = readFileSync(PANEL, "utf8");
    expect(src).toContain("reservationStatusLabel");
    expect(src).toContain("reservationNextOwnerAction");
    expect(src).toContain('"contacted"');
    expect(src).toContain("Confirm table");
    expect(src).toContain("Close / cancel");
    expect(src).toContain("grid gap-2 md:grid-cols-2");
    expect(src).not.toMatch(
      /rows\.filter\(\(row\) => row\.status === "requested"\)/
    );
  });

  it("owner action module supports contacted separately from confirmed", () => {
    const actions = readFileSync(ACTIONS, "utf8");
    const schema = readFileSync(
      join(REPO, "lib/restaurant-reservations/schema.ts"),
      "utf8"
    );
    expect(schema).toContain('"contacted"');
    expect(actions).toContain("ReservationOwnerUpdateStatus");
    expect(actions).toContain("eq(\"restaurant_id\"");
  });
});

describe("reservation analytics honesty", () => {
  it("load-analytics excludes harness sessions from reservation counts", () => {
    const src = readFileSync(
      join(REPO, "lib/analytics/load-analytics.ts"),
      "utf8"
    );
    expect(src).toMatch(/session_id/);
    expect(src).toMatch(
      /reservationRequests = excludeTestHarnessSessions/
    );
  });
});

describe("submit_reservation_request idempotency", () => {
  it("replays cached response for duplicate agent retries", async () => {
    const cachedBody = {
      ok: true,
      reservation_request: {
        id: "cached-id",
        status: "requested",
        message:
          "Reservation request saved for 4 guests — not a confirmed reservation. Staff will confirm availability.",
      },
    };
    let insertCount = 0;

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "agent_tool_idempotency") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(function eq() {
                return this;
              }),
              maybeSingle: vi.fn(async () => ({
                data: { response_body: cachedBody, http_status: 200 },
                error: null,
              })),
            })),
            upsert: vi.fn(async () => ({ error: null })),
          };
        }
        if (table === "restaurants") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { organization_id: "org-1" },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === "restaurant_reservation_requests") {
          return {
            insert: vi.fn(() => {
              insertCount += 1;
              return {
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({ data: null, error: null })),
                })),
              };
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "submit_reservation_request",
      body: {
        restaurant_id: RESTAURANT_ID,
        session_id: "conv_dup",
        customer_name: "Alex",
        customer_phone: "+14155550199",
        party_size: 2,
        requested_date: "Friday",
        requested_time: "7 PM",
        idempotency_key: "res-dup-key",
      },
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    expect(result.wroteDatabase).toBe(false);
    expect(insertCount).toBe(0);
    expect(
      (result.response as { reservation_request: { message: string } })
        .reservation_request.message
    ).toMatch(/not a confirmed reservation/i);
  });
});
