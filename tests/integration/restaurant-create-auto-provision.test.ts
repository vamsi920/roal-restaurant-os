import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ORG_ID,
  USER_ID,
  RESTAURANT_ID,
  TEMPLATE_AGENT_ID,
  CLONED_AGENT_ID,
  patchedAgentIds,
  profileUpdates,
} = vi.hoisted(() => ({
  ORG_ID: "00000000-0000-4000-8000-000000000001",
  USER_ID: "77777777-7777-4777-8777-777777777777",
  RESTAURANT_ID: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  TEMPLATE_AGENT_ID: "agent_template_global_roal",
  CLONED_AGENT_ID: "agent_clone_per_restaurant",
  patchedAgentIds: [] as string[],
  profileUpdates: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/auth/context-server", () => ({
  requireAuthContext: vi.fn(),
  resolveOrganizationId: vi.fn(),
}));

vi.mock("@/lib/billing/assert-gate", () => ({
  assertOrganizationBillingGate: vi.fn(),
}));

vi.mock("@/lib/onboarding/helpers", () => ({
  ensureRestaurantOnboarding: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

vi.mock("@/lib/env.server", () => ({
  getElevenLabsAgentId: vi.fn(() => TEMPLATE_AGENT_ID),
  getElevenLabsConversationInitSecret: vi.fn(() => "test-init-secret"),
  requireElevenLabsApiKey: vi.fn(() => "test-el-key"),
  requireRoalToolSecrets: vi.fn(),
}));

vi.mock("@/lib/elevenlabs", () => ({
  getConvaiAgent: vi.fn(),
  duplicateConvaiAgent: vi.fn(),
  createConvaiAgent: vi.fn(),
  patchConvaiAgent: vi.fn(),
  getElevenLabsApiKey: vi.fn(() => "test-el-key"),
}));

vi.mock("@/lib/sync-elevenlabs-roal-tools", () => ({
  syncRoalElevenLabsTools: vi.fn(),
}));

vi.mock("@/lib/elevenlabs-restaurant-agent-profile", () => ({
  applyRestaurantOrderAgentProfile: vi.fn(),
}));

vi.mock("@/lib/elevenlabs/phone-personalization", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/elevenlabs/phone-personalization")>();
  return {
    ...actual,
    buildConversationInitWebhookUrl: vi.fn(() => "https://app.test/webhook"),
  };
});

vi.mock("@/lib/restaurant-profile/helpers", () => ({
  ensureRestaurantProfile: vi.fn().mockResolvedValue({
    restaurant_id: RESTAURANT_ID,
    organization_id: ORG_ID,
  }),
}));

vi.mock("@/lib/observability/audit", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("@/lib/notifications/operational-events", () => ({
  emitProvisionFailureIfTransition: vi.fn().mockResolvedValue(false),
  emitMenuAutoSyncFailureIfTransition: vi.fn().mockResolvedValue(false),
}));

import { POST } from "@/app/api/restaurants/route";
import {
  requireAuthContext,
  resolveOrganizationId,
} from "@/lib/auth/context-server";
import { assertOrganizationBillingGate } from "@/lib/billing/assert-gate";
import {
  createConvaiAgent,
  duplicateConvaiAgent,
  getConvaiAgent,
  patchConvaiAgent,
} from "@/lib/elevenlabs";
import { applyRestaurantOrderAgentProfile } from "@/lib/elevenlabs-restaurant-agent-profile";
import { createServerSupabase } from "@/lib/supabase/server";
import { syncRoalElevenLabsTools } from "@/lib/sync-elevenlabs-roal-tools";

function ownerContext() {
  return {
    user: { id: USER_ID, email: "a@b.com" },
    memberships: [
      {
        id: "m1",
        organization_id: ORG_ID,
        user_id: USER_ID,
        role: "owner" as const,
        created_at: "",
        organization: {
          id: ORG_ID,
          name: "Org",
          slug: "org",
          created_at: "",
          updated_at: "",
        },
      },
    ],
    primaryMembership: null,
  };
}

function mockRestaurantRow(name: string) {
  return {
    id: RESTAURANT_ID,
    name,
    organization_id: ORG_ID,
    created_at: new Date().toISOString(),
  };
}

function buildSupabaseMock(restaurant: ReturnType<typeof mockRestaurantRow>) {
  return {
    from: vi.fn((table: string) => {
      if (table === "restaurants") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: restaurant, error: null }),
            })),
          })),
        };
      }
      if (table === "restaurant_profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  elevenlabs_provision_status: null,
                  elevenlabs_menu_auto_sync_status: null,
                },
                error: null,
              }),
            })),
          })),
          update: vi.fn((patch: Record<string, unknown>) => {
            profileUpdates.push(patch);
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }
      if (table === "audit_logs") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      throw new Error(`Unexpected table in test mock: ${table}`);
    }),
  };
}

function setupAuthAndBilling() {
  vi.mocked(requireAuthContext).mockResolvedValue({
    context: ownerContext(),
    errorResponse: null,
  });
  vi.mocked(resolveOrganizationId).mockReturnValue({ organizationId: ORG_ID });
  vi.mocked(assertOrganizationBillingGate).mockResolvedValue({
    ok: true,
    verdict: { hardBlocked: false, message: "" },
  } as never);
}

describe("restaurant create auto-provision (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patchedAgentIds.length = 0;
    profileUpdates.length = 0;
    setupAuthAndBilling();

    vi.mocked(getConvaiAgent).mockResolvedValue({
      agent_id: TEMPLATE_AGENT_ID,
      conversation_config: { agent: { prompt: { prompt: "template" } } },
    });
    vi.mocked(duplicateConvaiAgent).mockImplementation(async (templateId) => {
      expect(templateId).toBe(TEMPLATE_AGENT_ID);
      return { agent_id: CLONED_AGENT_ID };
    });
    vi.mocked(patchConvaiAgent).mockImplementation(async (agentId) => {
      patchedAgentIds.push(agentId);
      return { agent_id: agentId };
    });
    vi.mocked(syncRoalElevenLabsTools).mockResolvedValue({
      ok: true,
      agent_id: CLONED_AGENT_ID,
      tools: [],
      tool_ids_on_agent: ["tool_1"],
      restaurant_placeholders_updated: true,
      first_message_updated: true,
      restaurant_tools_baked: true,
    });
    vi.mocked(applyRestaurantOrderAgentProfile).mockResolvedValue({
      ok: true,
      agent_id: CLONED_AGENT_ID,
      knowledge_base_doc_attached: true,
      restaurant_placeholders_updated: true,
      patched_keys: ["prompt"],
    });
    vi.mocked(createConvaiAgent).mockRejectedValue(
      new Error("create fallback unavailable")
    );
  });

  it("returns 200 and creates restaurant when ElevenLabs provisioning fails", async () => {
    const restaurant = mockRestaurantRow("Fail Provision Kitchen");
    vi.mocked(createServerSupabase).mockResolvedValue(
      buildSupabaseMock(restaurant) as never
    );
    vi.mocked(duplicateConvaiAgent).mockRejectedValue(
      new Error("ElevenLabs duplicate unavailable")
    );
    vi.mocked(getConvaiAgent).mockResolvedValue({
      agent_id: TEMPLATE_AGENT_ID,
      conversation_config: {},
    });

    const res = await POST(
      new Request("http://localhost/api/restaurants", {
        method: "POST",
        body: JSON.stringify({ name: restaurant.name }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.restaurant).toMatchObject({
      id: RESTAURANT_ID,
      name: restaurant.name,
      organization_id: ORG_ID,
    });
    expect(body.voice_agent_provision).toMatchObject({
      ok: false,
      phase: "provision",
      agent_id: null,
    });
    expect(body.voice_agent_provision.warning).toMatch(
      /unavailable|duplicate|fallback/i
    );

    expect(profileUpdates.some((u) => u.elevenlabs_provision_status === "failed")).toBe(
      true
    );
    expect(
      profileUpdates.some((u) => u.elevenlabs_agent_id === CLONED_AGENT_ID)
    ).toBe(false);
    expect(syncRoalElevenLabsTools).not.toHaveBeenCalled();
    expect(patchedAgentIds).not.toContain(TEMPLATE_AGENT_ID);
  });

  it("saves cloned agent id on profile when provisioning succeeds", async () => {
    const restaurant = mockRestaurantRow("Success Kitchen");
    vi.mocked(createServerSupabase).mockResolvedValue(
      buildSupabaseMock(restaurant) as never
    );

    const res = await POST(
      new Request("http://localhost/api/restaurants", {
        method: "POST",
        body: JSON.stringify({ name: restaurant.name }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.voice_agent_provision).toEqual({
      ok: true,
      agent_id: CLONED_AGENT_ID,
      method: "duplicate",
    });

    const successPatch = profileUpdates.find(
      (u) =>
        u.elevenlabs_agent_id === CLONED_AGENT_ID &&
        u.elevenlabs_provision_status === "ready"
    );
    expect(successPatch).toBeDefined();
    expect(successPatch?.elevenlabs_provision_error).toBeNull();

    expect(duplicateConvaiAgent).toHaveBeenCalledWith(
      TEMPLATE_AGENT_ID,
      expect.objectContaining({ name: expect.stringContaining("Success Kitchen") })
    );
  });

  it("never patches or syncs the global template agent id", async () => {
    const restaurant = mockRestaurantRow("Template Safe Kitchen");
    vi.mocked(createServerSupabase).mockResolvedValue(
      buildSupabaseMock(restaurant) as never
    );

    const res = await POST(
      new Request("http://localhost/api/restaurants", {
        method: "POST",
        body: JSON.stringify({ name: restaurant.name }),
      })
    );

    expect(res.status).toBe(200);

    expect(syncRoalElevenLabsTools).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: CLONED_AGENT_ID })
    );
    expect(syncRoalElevenLabsTools).not.toHaveBeenCalledWith(
      expect.objectContaining({ agentId: TEMPLATE_AGENT_ID })
    );

    expect(applyRestaurantOrderAgentProfile).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: CLONED_AGENT_ID })
    );
    expect(applyRestaurantOrderAgentProfile).not.toHaveBeenCalledWith(
      expect.objectContaining({ agentId: TEMPLATE_AGENT_ID })
    );

    expect(patchedAgentIds).toContain(CLONED_AGENT_ID);
    expect(patchedAgentIds).not.toContain(TEMPLATE_AGENT_ID);

    const templateProfileSave = profileUpdates.find(
      (u) => u.elevenlabs_agent_id === TEMPLATE_AGENT_ID
    );
    expect(templateProfileSave).toBeUndefined();
  });

  it("does not return 500 when provisioning throws unexpectedly (still returns restaurant)", async () => {
    const restaurant = mockRestaurantRow("Throws Kitchen");
    vi.mocked(createServerSupabase).mockResolvedValue(
      buildSupabaseMock(restaurant) as never
    );
    vi.mocked(duplicateConvaiAgent).mockImplementation(() => {
      throw new Error("unexpected programmer throw");
    });

    const res = await POST(
      new Request("http://localhost/api/restaurants", {
        method: "POST",
        body: JSON.stringify({ name: restaurant.name }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.restaurant.id).toBe(RESTAURANT_ID);
    expect(body.voice_agent_provision.ok).toBe(false);
  });
});
