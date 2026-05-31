import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { simulateHarnessTool } from "@/lib/voice-agent/test-harness/simulate-tool";
import { RESTAURANT_ID } from "../fixtures/menu";

const REST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ORG_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SESSION_ID = "conv_reservation_a";

const validBody = {
  restaurant_id: RESTAURANT_ID,
  session_id: SESSION_ID,
  conversation_id: SESSION_ID,
  customer_name: "Priya Shah",
  customer_phone: "+1 (415) 555-0199",
  party_size: 4,
  requested_date: "Saturday, June 7",
  requested_time: "7:00 PM",
  notes: "Window booth if possible",
};

function createReservationStore() {
  let lastInsert: Record<string, unknown> | null = null;

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "restaurants") {
        const builder = {
          select: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          maybeSingle: vi.fn(async () => ({
            data: { organization_id: ORG_ID },
            error: null,
          })),
        };
        return builder;
      }

      if (table === "restaurant_reservation_requests") {
        const builder = {
          insert: vi.fn((payload: Record<string, unknown>) => {
            lastInsert = payload;
            return builder;
          }),
          select: vi.fn(() => builder),
          single: vi.fn(async () => ({
            data: {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              restaurant_id: lastInsert?.restaurant_id,
              session_id: lastInsert?.session_id ?? null,
              conversation_id: lastInsert?.conversation_id ?? null,
              customer_name: lastInsert?.customer_name,
              customer_phone: lastInsert?.customer_phone,
              party_size: lastInsert?.party_size,
              requested_date: lastInsert?.requested_date,
              requested_time: lastInsert?.requested_time,
              notes: lastInsert?.notes ?? null,
              status: lastInsert?.status ?? "requested",
              created_at: "2026-05-30T19:15:00.000Z",
            },
            error: null,
          })),
        };
        return builder;
      }

      throw new Error(`unexpected table ${table}`);
    }),
  };

  return {
    supabase,
    getLastInsert: () => lastInsert,
  };
}

function expectNotConfirmedWording(message: string) {
  expect(message).toMatch(/reservation request saved/i);
  expect(message).toMatch(/not a confirmed reservation/i);
  expect(message).toMatch(/staff will confirm/i);
  expect(message).not.toMatch(/your (table |reservation )?is confirmed/i);
  expect(message).not.toMatch(/we have you (down|booked|confirmed)/i);
}

describe("submit_reservation_request harness", () => {
  let store: ReturnType<typeof createReservationStore>;

  beforeEach(() => {
    store = createReservationStore();
  });

  it("saves a valid reservation request with session and callback links", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "submit_reservation_request",
      body: validBody,
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    expect(result.wroteDatabase).toBe(true);

    const insert = store.getLastInsert();
    expect(insert).toMatchObject({
      organization_id: ORG_ID,
      restaurant_id: RESTAURANT_ID,
      session_id: SESSION_ID,
      conversation_id: SESSION_ID,
      customer_name: validBody.customer_name,
      customer_phone: validBody.customer_phone,
      party_size: 4,
      requested_date: validBody.requested_date,
      requested_time: validBody.requested_time,
      notes: validBody.notes,
      status: "requested",
    });

    const reservation = (
      result.response as {
        reservation_request: {
          status: string;
          message: string;
          session_id: string | null;
          conversation_id: string | null;
        };
      }
    ).reservation_request;
    expect(reservation.status).toBe("requested");
    expect(reservation.session_id).toBe(SESSION_ID);
    expect(reservation.conversation_id).toBe(SESSION_ID);
    expectNotConfirmedWording(reservation.message);
  });

  it("rejects placeholder callback phones", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "submit_reservation_request",
      body: {
        ...validBody,
        customer_phone: "555-0100",
      },
      dryRun: false,
    });

    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(400);
    expect((result.response as { code: string }).code).toBe("invalid_customer_phone");
    expect(store.getLastInsert()).toBeNull();
  });

  it("rejects missing party size, date, or time", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "submit_reservation_request",
      body: {
        restaurant_id: RESTAURANT_ID,
        customer_name: "Priya Shah",
        customer_phone: "+14155550199",
      },
      dryRun: false,
    });

    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(400);
    const issues = (result.response as { issues?: { path: string }[] }).issues ?? [];
    expect(issues.some((i) => i.path === "party_size")).toBe(true);
    expect(issues.some((i) => i.path === "requested_date")).toBe(true);
    expect(issues.some((i) => i.path === "requested_time")).toBe(true);
    expect(store.getLastInsert()).toBeNull();
  });

  it("blocks restaurant_id mismatch before insert", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "submit_reservation_request",
      body: {
        ...validBody,
        restaurant_id: REST_B,
      },
      dryRun: false,
    });

    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(403);
    expect((result.response as { code: string }).code).toBe("restaurant_id_mismatch");
    expect(store.getLastInsert()).toBeNull();
  });

  it("uses request-received wording and never implies confirmation", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "submit_reservation_request",
      body: {
        ...validBody,
        session_id: undefined,
        conversation_id: undefined,
        notes: undefined,
        party_size: 1,
      },
      dryRun: true,
    });

    expect(result.ok).toBe(true);
    const reservation = (
      result.response as {
        reservation_request: { message: string; status: string };
      }
    ).reservation_request;
    expect(reservation.status).toBe("requested");
    expectNotConfirmedWording(reservation.message);
    expect(reservation.message).toContain("1 guest");
  });

  it("replays idempotent reservation submits without double insert", async () => {
    const idempotencyStore = new Map<string, unknown>();
    let insertCount = 0;

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "restaurants") {
          const builder = {
            select: vi.fn(() => builder),
            eq: vi.fn(() => builder),
            maybeSingle: vi.fn(async () => ({
              data: { organization_id: ORG_ID },
              error: null,
            })),
          };
          return builder;
        }
        if (table === "agent_tool_idempotency") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(function eq() {
                return this;
              }),
              maybeSingle: vi.fn(async () => {
                const cached = idempotencyStore.get("res-key");
                return cached
                  ? { data: cached, error: null }
                  : { data: null, error: null };
              }),
            })),
            upsert: vi.fn(async (payload: Record<string, unknown>) => {
              idempotencyStore.set(String(payload.idempotency_key), {
                response_body: payload.response_body,
                http_status: payload.http_status,
              });
              return { error: null };
            }),
          };
        }
        if (table === "restaurant_reservation_requests") {
          const builder = {
            insert: vi.fn(() => {
              insertCount += 1;
              return builder;
            }),
            select: vi.fn(() => builder),
            single: vi.fn(async () => ({
              data: {
                id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                restaurant_id: RESTAURANT_ID,
                session_id: SESSION_ID,
                conversation_id: SESSION_ID,
                customer_name: validBody.customer_name,
                customer_phone: validBody.customer_phone,
                party_size: 4,
                requested_date: validBody.requested_date,
                requested_time: validBody.requested_time,
                notes: validBody.notes,
                status: "requested",
                created_at: "2026-05-30T19:15:00.000Z",
              },
              error: null,
            })),
          };
          return builder;
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const body = { ...validBody, idempotency_key: "res-key" };
    const first = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "submit_reservation_request",
      body,
      dryRun: false,
    });
    const second = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "submit_reservation_request",
      body,
      dryRun: false,
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(insertCount).toBe(1);
    expect(second.wroteDatabase).toBe(false);
    expectNotConfirmedWording(
      (
        second.response as {
          reservation_request: { message: string };
        }
      ).reservation_request.message
    );
  });
});
