/**
 * Tenant isolation without Postgres RLS: every read/write must be scoped to a
 * restaurant / organization the caller was verified to access. These tests run
 * the real access helpers and handlers against the in-memory document store with
 * two tenants and assert nothing crosses over.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { sessionUser } = vi.hoisted(() => ({
  sessionUser: { current: null as null | { id: string; email: string | null } },
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(async () =>
    sessionUser.current
      ? { ...sessionUser.current, user_metadata: {}, provider: "firebase" as const }
      : null
  ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  unstable_noStore: vi.fn(),
}));

vi.mock("@/lib/voice-agent/run-restaurant-voice-agent-sync", () => ({
  runRestaurantVoiceAgentSync: vi.fn(async () => {
    throw new Error("sync must not run in these tests");
  }),
}));

import { getDb } from "@/lib/db";
import { resetMemoryStore } from "@/lib/db/store";
import {
  findMembershipForOrg,
  getAuthContext,
  getRestaurantAccessForPage,
  requireRestaurantAccess,
  resolveOrganizationId,
} from "@/lib/auth/context-server";
import { tryClaimLegacyPocMembership } from "@/lib/auth/claim-legacy-org";
import { loadLocationsForContext } from "@/lib/restaurant-list/load-locations";
import { GET as getLiveOrders } from "@/app/api/restaurants/[id]/live/orders/route";
import { GET as getLiveMenu } from "@/app/api/restaurants/[id]/live/menu/route";
import { GET as getLiveCallStatus } from "@/app/api/restaurants/[id]/live/call-status/route";
import { GET as getLocations } from "@/app/api/restaurants/locations/route";
import { isElevenLabsConversationInitAuthorized } from "@/lib/elevenlabs/conversation-init";
import { parseElevenLabsPostCallEvent } from "@/lib/elevenlabs/post-call-webhook";
import { LEGACY_POC_ORGANIZATION_ID } from "@/lib/types";

const USER_A = { id: "user-a", email: "a@tenant-a.example" };
const USER_B = { id: "user-b", email: "b@tenant-b.example" };
const MEMBER_A = { id: "user-a-member", email: "member@tenant-a.example" };

type Fixture = {
  orgA: string;
  orgB: string;
  restA: string;
  restB: string;
  itemB: string;
  modifierB: string;
};

async function seedTwoTenants(): Promise<Fixture> {
  const db = getDb();
  const orgA = (await db.from("organizations").insert({ name: "Tenant A", slug: "tenant-a" }).select("id").single()).data.id as string;
  const orgB = (await db.from("organizations").insert({ name: "Tenant B", slug: "tenant-b" }).select("id").single()).data.id as string;
  await db.from("memberships").insert([
    { organization_id: orgA, user_id: USER_A.id, role: "owner" },
    { organization_id: orgA, user_id: MEMBER_A.id, role: "member" },
    { organization_id: orgB, user_id: USER_B.id, role: "owner" },
  ]);
  const restA = (await db.from("restaurants").insert({ name: "A Pizza", organization_id: orgA }).select("id").single()).data.id as string;
  const restB = (await db.from("restaurants").insert({ name: "B Tacos", organization_id: orgB }).select("id").single()).data.id as string;

  await db.rpc("merge_menu", {
    p_restaurant_id: restA,
    p_menu: { categories: [{ name: "Pizza", items: [{ name: "Margherita", price: 15 }] }] },
  });
  await db.rpc("merge_menu", {
    p_restaurant_id: restB,
    p_menu: {
      categories: [
        {
          name: "Tacos",
          items: [{ name: "Al Pastor", price: 4, modifiers: [{ group_name: "Salsa", modifier_name: "Verde" }] }],
        },
      ],
    },
  });
  const catB = (await db.from("categories").select("id").eq("restaurant_id", restB).single()).data.id as string;
  const itemB = (await db.from("items").select("id").eq("category_id", catB).single()).data.id as string;
  const modifierB = (await db.from("modifiers").select("id").eq("item_id", itemB).single()).data.id as string;

  for (const [rid, sid, name] of [
    [restA, "sess-a-1", "Alice"],
    [restB, "sess-b-1", "Bob"],
  ] as const) {
    await db.from("draft_orders").insert({ restaurant_id: rid, session_id: sid, status: "new", items: [{ name: "x", quantity: 1 }], customer_name: name });
    await db.from("phone_order_receipts").insert({ restaurant_id: rid, session_id: sid, items: [{ name: "x", quantity: 1 }], customer_name: name });
  }
  await db.from("restaurant_profiles").update({ elevenlabs_agent_id: "agent-b-dedicated" }).eq("restaurant_id", restB);
  await db.from("restaurant_profiles").update({ elevenlabs_agent_id: "agent-a-dedicated" }).eq("restaurant_id", restA);
  return { orgA, orgB, restA, restB, itemB, modifierB };
}

function routeCtx(id: string) {
  return { params: { id } };
}

describe("tenant isolation (no RLS)", () => {
  let fx: Fixture;

  beforeEach(async () => {
    resetMemoryStore();
    sessionUser.current = null;
    fx = await seedTwoTenants();
  });

  describe("access helpers", () => {
    it("requireRestaurantAccess: own restaurant ok, other tenant 403, unknown 404, signed out 401", async () => {
      sessionUser.current = USER_A;
      const own = await requireRestaurantAccess(fx.restA);
      expect(own.errorResponse).toBeNull();
      expect(own.access?.restaurant.id).toBe(fx.restA);

      const foreign = await requireRestaurantAccess(fx.restB);
      expect(foreign.errorResponse?.status).toBe(403);
      expect(foreign.access).toBeNull();

      expect((await requireRestaurantAccess("does-not-exist")).errorResponse?.status).toBe(404);

      sessionUser.current = null;
      expect((await requireRestaurantAccess(fx.restA)).errorResponse?.status).toBe(401);
    });

    it("requireRestaurantAccess requireAdmin rejects plain members", async () => {
      sessionUser.current = MEMBER_A;
      expect((await requireRestaurantAccess(fx.restA)).errorResponse).toBeNull();
      expect((await requireRestaurantAccess(fx.restA, { requireAdmin: true })).errorResponse?.status).toBe(403);
    });

    it("getRestaurantAccessForPage returns null for another tenant's restaurant", async () => {
      sessionUser.current = USER_A;
      expect((await getRestaurantAccessForPage(fx.restA))?.restaurant.id).toBe(fx.restA);
      expect(await getRestaurantAccessForPage(fx.restB)).toBeNull();
    });

    it("memberships only come from the caller's own rows", async () => {
      sessionUser.current = USER_A;
      const ctx = (await getAuthContext())!;
      expect(ctx.memberships.map((m) => m.organization_id)).toEqual([fx.orgA]);
      expect(findMembershipForOrg(ctx, fx.orgB)).toBeUndefined();
      expect(resolveOrganizationId(ctx, fx.orgB)).toEqual({ error: expect.any(String) });
      expect(resolveOrganizationId(ctx, null)).toEqual({ organizationId: fx.orgA });
    });

    it("does not auto-join new users to the Legacy POC org", async () => {
      sessionUser.current = { id: "brand-new", email: "new@example.com" };
      const ctx = (await getAuthContext())!;
      expect(ctx.memberships).toHaveLength(0);
      const rows = (await getDb().from("memberships").select("id").eq("user_id", "brand-new")).data;
      expect(rows).toHaveLength(0);
    });
  });

  describe("Legacy POC claim", () => {
    it("only claims while the legacy org exists and has zero members", async () => {
      const db = getDb();
      expect(await tryClaimLegacyPocMembership(db, "first-user")).toBe(false); // org missing

      await db.from("organizations").insert({ id: LEGACY_POC_ORGANIZATION_ID, name: "Legacy POC", slug: "legacy-poc" });
      expect(await tryClaimLegacyPocMembership(db, "first-user")).toBe(true);
      expect(await tryClaimLegacyPocMembership(db, "second-user")).toBe(false); // already has a member
      const members = (await db.from("memberships").select("user_id").eq("organization_id", LEGACY_POC_ORGANIZATION_ID)).data;
      expect(members).toEqual([{ user_id: "first-user" }]);
    });
  });

  describe("live polling endpoints", () => {
    it("Kitchen orders: 200 with only own rows; 403 for another tenant", async () => {
      sessionUser.current = USER_A;
      const ok = await getLiveOrders(new Request("http://x"), routeCtx(fx.restA));
      expect(ok.status).toBe(200);
      const body = await ok.json();
      expect(body.draftOrders.map((d: { customer_name: string }) => d.customer_name)).toEqual(["Alice"]);
      expect(body.receipts.every((r: { restaurant_id: string }) => r.restaurant_id === fx.restA)).toBe(true);

      const denied = await getLiveOrders(new Request("http://x"), routeCtx(fx.restB));
      expect(denied.status).toBe(403);
      expect(JSON.stringify(await denied.json())).not.toContain("Bob");
    });

    it("menu and call-status: 403 for another tenant, 401 signed out", async () => {
      sessionUser.current = USER_A;
      expect((await getLiveMenu(new Request("http://x"), routeCtx(fx.restB))).status).toBe(403);
      expect((await getLiveCallStatus(new Request("http://x"), routeCtx(fx.restB))).status).toBe(403);
      const menu = await (await getLiveMenu(new Request("http://x"), routeCtx(fx.restA))).json();
      expect(menu.items.map((i: { name: string }) => i.name)).toEqual(["Margherita"]);

      sessionUser.current = null;
      expect((await getLiveMenu(new Request("http://x"), routeCtx(fx.restA))).status).toBe(401);
      expect((await getLocations()).status).toBe(401);
    });

    it("locations list is scoped to the caller's org memberships", async () => {
      sessionUser.current = USER_A;
      const res = await getLocations();
      const body = await res.json();
      expect(body.restaurants.map((r: { id: string }) => r.id)).toEqual([fx.restA]);
      expect(Object.keys(body.profilesByRestaurantId)).toEqual([fx.restA]);
      expect(Object.keys(body.statsByRestaurantId)).toEqual([fx.restA]);

      const ctxB = { ...(await getAuthContext())!, memberships: [] };
      expect((await loadLocationsForContext(getDb(), ctxB)).restaurants).toEqual([]);
    });
  });

  describe("server actions that relied on RLS", () => {
    it("onboarding: cannot write another org's restaurant profile or menu step", async () => {
      sessionUser.current = USER_A;
      const { saveRestaurantProfileAction, completeMenuImportStepAction, setWizardStepStatusAction } = await import(
        "@/app/dashboard/onboarding/actions"
      );
      await expect(
        saveRestaurantProfileAction({ restaurantId: fx.restB, organizationId: fx.orgA, name: "Hijacked" })
      ).rejects.toThrow(/does not belong/);
      await expect(
        completeMenuImportStepAction({ restaurantId: fx.restB, organizationId: fx.orgA })
      ).rejects.toThrow(/does not belong/);
      await expect(
        setWizardStepStatusAction({ scope: "restaurant", organizationId: fx.orgA, restaurantId: fx.restA, step: "bogus", status: "completed" })
      ).rejects.toThrow(/Unknown onboarding step/);

      const profileB = (await getDb().from("restaurant_profiles").select("*").eq("restaurant_id", fx.restB).single()).data;
      expect(profileB.organization_id).toBe(fx.orgB);
      const onbB = (await getDb().from("restaurant_onboarding").select("steps").eq("restaurant_id", fx.restB).single()).data;
      expect(onbB.steps.menu_import.status).toBe("pending");
    });

    it("menu: deleting another tenant's modifier by id is rejected and leaves it intact", async () => {
      sessionUser.current = USER_A;
      const { deleteModifierAction } = await import("@/app/dashboard/restaurants/[id]/menu/menu-actions");
      await expect(deleteModifierAction(fx.restA, fx.modifierB)).rejects.toThrow(/Modifier not found/);
      const still = (await getDb().from("modifiers").select("id").eq("id", fx.modifierB)).data;
      expect(still).toHaveLength(1);

      sessionUser.current = null;
      await expect(deleteModifierAction(fx.restB, fx.modifierB)).rejects.toThrow(/access/);
    });

    it("voice agent: cannot connect an agent already bound to another tenant's restaurant", async () => {
      sessionUser.current = USER_A;
      const { connectVoiceAgentAction } = await import("@/app/dashboard/restaurants/[id]/voice-agent-actions");
      await expect(
        connectVoiceAgentAction({ agentId: "agent-b-dedicated", restaurantId: fx.restA, restaurantName: "A Pizza" })
      ).rejects.toThrow(/already connected to another location/);
      const profileB = (await getDb().from("restaurant_profiles").select("elevenlabs_agent_id").eq("restaurant_id", fx.restB).single()).data;
      expect(profileB.elevenlabs_agent_id).toBe("agent-b-dedicated");
    });
  });

  describe("server-to-server webhooks", () => {
    it("post-call webhook trusts the agent binding over a payload restaurant_id", async () => {
      const parsed = await parseElevenLabsPostCallEvent(
        {
          type: "post_call_transcription",
          event_timestamp: Math.floor(Date.now() / 1000),
          data: {
            agent_id: "agent-a-dedicated",
            conversation_id: "conv-crafted",
            conversation_initiation_client_data: { dynamic_variables: { restaurant_id: fx.restB } },
            metadata: {},
          },
        },
        getDb()
      );
      expect(parsed?.restaurantId).toBe(fx.restA);
    });

    it("conversation-init fails closed in production when the secret is unset", () => {
      expect(isElevenLabsConversationInitAuthorized({ configuredSecret: undefined, production: true })).toBe(false);
      expect(isElevenLabsConversationInitAuthorized({ configuredSecret: undefined, production: false })).toBe(true);
      expect(isElevenLabsConversationInitAuthorized({ configuredSecret: "s", headerSecret: "s", production: true })).toBe(true);
    });
  });
});
