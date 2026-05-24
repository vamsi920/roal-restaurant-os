import type { HarnessScenario } from "@/lib/voice-agent/test-harness/types";

const INVALID_ITEM = "__ROAL_HARNESS_INVALID__";
const INVALID_MODIFIER = "__ROAL_HARNESS_INVALID_MODIFIER__";

export const HARNESS_SCENARIOS: HarnessScenario[] = [
  {
    id: "menu_and_hours",
    name: "Load menu & hours",
    description:
      "Agent calls get_menu_items at call start. Review operations.ordering_allowed before taking orders.",
    templates: [
      {
        guestLine: "(call connects)",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
    ],
  },
  {
    id: "happy_pickup_order",
    name: "Happy path — pickup order",
    description:
      "get_menu → sync cart with a real item → finalize with test guest info. Uses first available menu item.",
    templates: [
      {
        guestLine: "Hi, I'd like pickup please.",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
      {
        guestLine: "I'll take two of your first special.",
        tool: "sync_draft_order",
        buildInput: (ctx, sessionId) => ({
          session_id: sessionId,
          status: "draft",
          items: ctx?.firstAvailableItemName
            ? [{ name: ctx.firstAvailableItemName, quantity: 2 }]
            : [],
        }),
      },
      {
        guestLine: "That's all. Name is Alex, phone 555-010-2233.",
        tool: "finalize_order",
        buildInput: (_ctx, sessionId) => ({
          session_id: sessionId,
          customer_name: "Alex",
          customer_phone: "555-010-2233",
        }),
      },
    ],
  },
  {
    id: "unavailable_item_sync",
    name: "Sold-out item",
    description:
      "sync_draft_order with an unavailable menu item should fail validation.",
    templates: [
      {
        guestLine: "(call connects)",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
      {
        guestLine: "I'll take one of the sold-out specials.",
        tool: "sync_draft_order",
        buildInput: (ctx, sessionId) => ({
          session_id: sessionId,
          status: "draft",
          items: ctx?.firstUnavailableItemName
            ? [{ name: ctx.firstUnavailableItemName, quantity: 1 }]
            : [],
        }),
        expectFailure: true,
      },
    ],
  },
  {
    id: "invalid_modifier_sync",
    name: "Invalid modifier",
    description:
      "sync_draft_order with an off-menu modifier name should fail validation.",
    templates: [
      {
        guestLine: "(call connects)",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
      {
        guestLine: "Burger with extra unicorn sauce.",
        tool: "sync_draft_order",
        buildInput: (ctx, sessionId) => ({
          session_id: sessionId,
          status: "draft",
          items: ctx?.requiredModifier
            ? [
                {
                  name: ctx.requiredModifier.itemName,
                  quantity: 1,
                  customizations: [INVALID_MODIFIER],
                },
              ]
            : ctx?.firstAvailableItemName
              ? [
                  {
                    name: ctx.firstAvailableItemName,
                    quantity: 1,
                    customizations: [INVALID_MODIFIER],
                  },
                ]
              : [],
        }),
        expectFailure: true,
      },
    ],
  },
  {
    id: "valid_modifier_sync",
    name: "Valid modifier choice",
    description:
      "sync_draft_order with a required modifier group filled using a real menu choice.",
    templates: [
      {
        guestLine: "(call connects)",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
      {
        guestLine: "One combo, large please.",
        tool: "sync_draft_order",
        buildInput: (ctx, sessionId) => ({
          session_id: sessionId,
          status: "draft",
          items: ctx?.requiredModifier
            ? [
                {
                  name: ctx.requiredModifier.itemName,
                  quantity: 1,
                  customizations: [ctx.requiredModifier.exampleModifierName],
                },
              ]
            : [],
        }),
      },
    ],
  },
  {
    id: "required_modifier_missing",
    name: "Required modifier missing",
    description:
      "Items with required modifier groups must include a valid choice before sync.",
    templates: [
      {
        guestLine: "(call connects)",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
      {
        guestLine: "One combo, no options selected.",
        tool: "sync_draft_order",
        buildInput: (ctx, sessionId) => ({
          session_id: sessionId,
          status: "draft",
          items: ctx?.requiredModifier
            ? [
                {
                  name: ctx.requiredModifier.itemName,
                  quantity: 1,
                  customizations: [],
                },
              ]
            : [],
        }),
        expectFailure: true,
      },
    ],
  },
  {
    id: "invalid_menu_item",
    name: "Invalid line item",
    description:
      "sync_draft_order with an off-menu item should fail menu validation before any write.",
    templates: [
      {
        guestLine: "(call connects)",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
      {
        guestLine: "One unicorn burger please.",
        tool: "sync_draft_order",
        buildInput: (_ctx, sessionId) => ({
          session_id: sessionId,
          status: "draft",
          items: [{ name: INVALID_ITEM, quantity: 1 }],
        }),
        expectFailure: true,
      },
    ],
  },
  {
    id: "finalize_without_customer",
    name: "Finalize missing guest info",
    description:
      "finalize_order without customer_name / customer_phone should be rejected.",
    templates: [
      {
        guestLine: "(call connects)",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
      {
        guestLine: "Just one appetizer to go.",
        tool: "sync_draft_order",
        buildInput: (ctx, sessionId) => ({
          session_id: sessionId,
          status: "draft",
          items: ctx?.firstAvailableItemName
            ? [{ name: ctx.firstAvailableItemName, quantity: 1 }]
            : [],
        }),
      },
      {
        guestLine: "That's it.",
        tool: "finalize_order",
        buildInput: (_ctx, sessionId) => ({
          session_id: sessionId,
        }),
        expectFailure: true,
      },
    ],
  },
  {
    id: "empty_cart_finalize",
    name: "Finalize empty cart",
    description:
      "finalize_order with no prior cart should fail (no line items).",
    templates: [
      {
        guestLine: "(call connects)",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
      {
        guestLine: "Never mind, finalize anyway.",
        tool: "finalize_order",
        buildInput: (_ctx, sessionId) => ({
          session_id: sessionId,
          customer_name: "Test Guest",
          customer_phone: "555-000-1111",
        }),
        expectFailure: true,
      },
    ],
  },
  {
    id: "closed_restaurant_sync",
    name: "Order while closed",
    description:
      "When ordering_allowed is false, sync and finalize should return restaurant_closed.",
    templates: [
      {
        guestLine: "(call connects)",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
      {
        guestLine: "I'd like to place an order.",
        tool: "sync_draft_order",
        buildInput: (ctx, sessionId) => ({
          session_id: sessionId,
          status: "draft",
          items: ctx?.firstAvailableItemName
            ? [{ name: ctx.firstAvailableItemName, quantity: 1 }]
            : [],
        }),
      },
      {
        guestLine: "Finalize anyway.",
        tool: "finalize_order",
        buildInput: (_ctx, sessionId) => ({
          session_id: sessionId,
          customer_name: "Alex",
          customer_phone: "555-010-2233",
        }),
      },
    ],
  },
];

export function getHarnessScenario(id: string): HarnessScenario | undefined {
  return HARNESS_SCENARIOS.find((s) => s.id === id);
}
