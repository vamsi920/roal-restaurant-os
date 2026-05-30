import type { HarnessScenario } from "@/lib/voice-agent/test-harness/types";

const INVALID_ITEM = "__ROAL_HARNESS_INVALID__";
const INVALID_MODIFIER = "__ROAL_HARNESS_INVALID_MODIFIER__";

export const HARNESS_SCENARIOS: HarnessScenario[] = [
  {
    id: "pickup_order",
    name: "Pickup order",
    description:
      "Happy path: get_menu_items → sync a real available item → finalize with valid guest name and phone.",
    requireOrderingOpen: true,
    templates: [
      {
        guestLine: "Hi, I'd like pickup please.",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
      {
        guestLine: "I'll take one of the first available items.",
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
    id: "menu_question",
    name: "Menu question",
    description:
      "Guest asks what is on the menu. Agent calls get_menu_items and answers from data—no sync_draft_order or finalize_order for Q&A only.",
    templates: [
      {
        guestLine: "What do you have that's vegetarian?",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
    ],
  },
  {
    id: "closed_hours_call",
    name: "Closed hours call",
    description:
      "Guest asks if you are open while ordering_allowed is false. Agent uses get_menu_items operations message—must not place orders.",
    requireOrderingClosed: true,
    templates: [
      {
        guestLine: "Are you open right now?",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
    ],
  },
  {
    id: "catering_handoff",
    name: "Catering handoff",
    description:
      "Large-party / catering request. Agent loads menu for context; follow profile catering route—no order tools unless the guest also orders.",
    templates: [
      {
        guestLine: "I need catering for about 40 people next Saturday.",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
    ],
  },
  {
    id: "complaint_handoff",
    name: "Complaint handoff",
    description:
      "Service complaint. Agent may call get_menu_items; follow complaint route—do not finalize unless starting a new order.",
    templates: [
      {
        guestLine: "My order last night was wrong and the food was cold.",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
    ],
  },
  {
    id: "unavailable_item",
    name: "Unavailable item",
    description:
      "sync_draft_order with a sold-out menu item fails real menu validation (item_unavailable).",
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
    id: "finalize_missing_guest",
    name: "Finalize missing name & phone",
    description:
      "finalize_order without customer_name / customer_phone is rejected by request schema.",
    templates: [
      {
        guestLine: "(call connects)",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
      {
        guestLine: "One appetizer to go.",
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
        guestLine: "That's it—no name or number yet.",
        tool: "finalize_order",
        buildInput: (_ctx, sessionId) => ({
          session_id: sessionId,
        }),
        expectFailure: true,
      },
    ],
  },
  {
    id: "finalize_missing_phone",
    name: "Finalize missing valid phone",
    description:
      "finalize_order with a real name but fewer than 10 phone digits fails validateCustomerForFinalize.",
    templates: [
      {
        guestLine: "(call connects)",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
      {
        guestLine: "One burger to go.",
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
        guestLine: "Name is Jordan Lee.",
        tool: "finalize_order",
        buildInput: (_ctx, sessionId) => ({
          session_id: sessionId,
          customer_name: "Jordan Lee",
          customer_phone: "123",
        }),
        expectFailure: true,
      },
    ],
  },
  {
    id: "finalize_missing_name",
    name: "Finalize missing valid name",
    description:
      "finalize_order with a valid phone but a too-short name fails validateCustomerForFinalize.",
    templates: [
      {
        guestLine: "(call connects)",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
      {
        guestLine: "One salad to go.",
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
        guestLine: "Phone is 555-010-9988.",
        tool: "finalize_order",
        buildInput: (_ctx, sessionId) => ({
          session_id: sessionId,
          customer_name: "J",
          customer_phone: "555-010-9988",
        }),
        expectFailure: true,
      },
    ],
  },
  {
    id: "closed_restaurant_sync",
    name: "Order while closed",
    description:
      "When ordering_allowed is false, sync_draft_order and finalize_order return restaurant_closed.",
    requireOrderingClosed: true,
    templates: [
      {
        guestLine: "(call connects)",
        tool: "get_menu_items",
        buildInput: () => ({}),
      },
      {
        guestLine: "I'd like to place an order anyway.",
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
];

export function getHarnessScenario(id: string): HarnessScenario | undefined {
  return HARNESS_SCENARIOS.find((s) => s.id === id);
}
