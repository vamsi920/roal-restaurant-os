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
  restaurantName: "Joe's Corner Kitchen",
  scanStats: { categories: 4, items: 18, modifiers: 12 },
  categories: [
    {
      id: "c1",
      name: "Poke & Bowls",
      sort_order: 1,
      items: [
        {
          id: "i1",
          name: "Spicy tuna poke",
          description: "Sesame rice, cucumber, avocado",
          price: 14.5,
          is_available: true,
          modifiers: [
            { group_name: "Protein", modifier_name: "Extra tuna" },
            { group_name: "Spice", modifier_name: "Mild" },
          ],
        },
        {
          id: "i2",
          name: "Salmon bowl",
          price: 15.0,
          is_available: true,
          modifiers: [],
        },
      ],
    },
    {
      id: "c2",
      name: "Noodles",
      sort_order: 2,
      items: [
        {
          id: "i3",
          name: "Garlic noodles",
          price: 12.0,
          is_available: true,
          modifiers: [],
        },
      ],
    },
    {
      id: "c3",
      name: "Sides",
      sort_order: 3,
      items: [
        {
          id: "i4",
          name: "Miso soup",
          price: 4.5,
          is_available: true,
          modifiers: [],
        },
        {
          id: "i5",
          name: "Edamame",
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
      { name: "Spicy tuna poke", quantity: 1, customizations: ["Extra tuna"] },
      { name: "Miso soup", quantity: 1 },
    ],
    updated_at: "2026-05-23T19:39:00.000Z",
  },
  completedReceipt: {
    customer_name: "Maria",
    items: [{ name: "Garlic noodles", quantity: 1 }],
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
