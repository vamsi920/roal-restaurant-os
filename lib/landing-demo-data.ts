/** Canonical demo snapshot when live Supabase data is unavailable. */
export type LandingMenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number | null;
  is_available: boolean;
  modifiers: { group_name: string; modifier_name: string }[];
};

export type LandingCategory = {
  id: string;
  name: string;
  sort_order: number;
  items: LandingMenuItem[];
};

export type LandingOrderLine = {
  name: string;
  quantity: number;
  customizations?: string[];
};

export type LandingPreviewData = {
  source: "demo" | "live";
  restaurantName: string;
  categories: LandingCategory[];
  liveDraft: {
    session_id: string;
    customer_name: string | null;
    customer_phone: string | null;
    items: LandingOrderLine[];
    updated_at: string;
  } | null;
  completedReceipt: {
    customer_name: string | null;
    items: LandingOrderLine[];
    created_at: string;
  } | null;
  scanStats: { categories: number; items: number; modifiers: number };
};

export const LANDING_DEMO: LandingPreviewData = {
  source: "demo",
  restaurantName: "Napoli Pizza",
  scanStats: { categories: 4, items: 18, modifiers: 12 },
  categories: [
    {
      id: "c1",
      name: "Pizzas",
      sort_order: 1,
      items: [
        {
          id: "i1",
          name: "Margherita pizza",
          description: "San Marzano tomato, mozzarella, basil",
          price: 17.0,
          is_available: true,
          modifiers: [
            { group_name: "Toppings", modifier_name: "No basil" },
            { group_name: "Size", modifier_name: "Large" },
          ],
        },
        {
          id: "i2",
          name: "Pepperoni pizza",
          price: 18.0,
          is_available: true,
          modifiers: [],
        },
      ],
    },
    {
      id: "c2",
      name: "Sides",
      sort_order: 2,
      items: [
        {
          id: "i3",
          name: "Garlic knots",
          price: 6.0,
          is_available: true,
          modifiers: [{ group_name: "Sauce", modifier_name: "Add marinara" }],
        },
      ],
    },
    {
      id: "c3",
      name: "Drinks",
      sort_order: 3,
      items: [
        {
          id: "i4",
          name: "Lemonade",
          price: 3.0,
          is_available: true,
          modifiers: [],
        },
        {
          id: "i5",
          name: "House cola",
          price: 5.0,
          is_available: false,
          modifiers: [],
        },
      ],
    },
  ],
  liveDraft: {
    session_id: "call_8f2a",
    customer_name: "Alex",
    customer_phone: "(512) 555-0142",
    items: [
      { name: "Margherita pizza", quantity: 2, customizations: ["One no basil"] },
      { name: "Garlic knots", quantity: 1, customizations: ["Add marinara"] },
    ],
    updated_at: "2026-05-23T19:39:00.000Z",
  },
  completedReceipt: {
    customer_name: "Maria",
    items: [{ name: "Pepperoni pizza", quantity: 1 }],
    created_at: "2026-05-23T18:39:00.000Z",
  },
};

export function landingMenuTotals(data: LandingPreviewData) {
  let items = 0;
  let modifiers = 0;
  for (const c of data.categories) {
    items += c.items.length;
    for (const it of c.items) modifiers += it.modifiers.length;
  }
  return {
    categories: data.categories.length,
    items,
    modifiers,
  };
}
