import { describe, expect, it } from "vitest";
import { ownedWebhookToolId, ROAL_TOOL_SPEECH, toolRestaurantId } from "@/lib/sync-elevenlabs-roal-tools";
import { menuPromptLines } from "@/lib/elevenlabs/load-menu-prompt-snapshot";
import { linesFromDraft, pickCurrentOrder } from "@/components/voice-agent/LiveOrderTicket";

const tool = (id: string, name: string, rid: string | null) => ({
  id,
  tool_config: {
    type: "webhook",
    name,
    api_schema: { url: `https://tryroal.com/api/agent-tools/x${rid ? `?restaurant_id=${rid}` : ""}` },
  },
});

describe("tool ownership", () => {
  const tools = [tool("t-a", "finalize_order", "rest-a"), tool("t-shared", "finalize_order", null)];

  it("reads the restaurant a tool is baked for", () => {
    expect(toolRestaurantId(tools[0])).toBe("rest-a");
    expect(toolRestaurantId(tools[1])).toBe("");
  });

  it("never reuses another restaurant's tool", () => {
    expect(ownedWebhookToolId(tools, "finalize_order", "rest-a")).toBe("t-a");
    expect(ownedWebhookToolId(tools, "finalize_order", "rest-b")).toBeUndefined();
    expect(ownedWebhookToolId(tools, "finalize_order", "")).toBe("t-shared");
  });

  it("speaks a filler before lookups and syncs the cart in the background", () => {
    expect(ROAL_TOOL_SPEECH.finalize_order.force_pre_tool_speech).toBe(true);
    expect(ROAL_TOOL_SPEECH.get_menu_items.force_pre_tool_speech).toBe(true);
    expect(ROAL_TOOL_SPEECH.sync_draft_order.execution_mode).toBe("async");
  });
});

describe("menu in the prompt", () => {
  it("lists available items with prices and options by category", () => {
    const text = menuPromptLines({
      categories: [{ id: "c1", name: "Rolls", sort_order: 1 }],
      items: [
        { id: "i1", category_id: "c1", name: "Chicken Tikka Roll", price: 11.99, is_available: true, sort_order: 1, description: null },
        { id: "i2", category_id: "c1", name: "Sold Out Roll", price: 9, is_available: false, sort_order: 2, description: null },
      ],
      modifiers: [{ item_id: "i1", group_name: "Spice", modifier_name: "Hot", extra_price: 0 }],
    });
    expect(text).toBe("Rolls:\n- Chicken Tikka Roll $11.99 (Spice: Hot)");
  });
});

describe("live order ticket", () => {
  it("shows the newest recent order with prices", () => {
    const now = Date.parse("2026-10-28T20:00:00Z");
    const row = (id: string, updated: string) =>
      ({ id, status: "draft", updated_at: updated, items: [{ name: "Boil Fry", quantity: 2, unit_price: 7.99 }] }) as never;
    const picked = pickCurrentOrder([row("old", "2026-10-28T18:00:00Z"), row("new", "2026-10-28T19:59:00Z")], now);
    expect(picked).toMatchObject({ id: "new" });
    expect(linesFromDraft(picked!)).toEqual([{ name: "Boil Fry", qty: 2, unitPrice: 7.99, mods: [] }]);
    expect(pickCurrentOrder([row("old", "2026-10-28T18:00:00Z")], now)).toBeNull();
  });
});
