import type { ScannedMenu } from "@/lib/menu-import/types";

/** Fallback menu so the test call still works when a website menu cannot be read. */
export function buildSampleMenu(cuisineOrName: string | null | undefined): ScannedMenu {
  const c = (cuisineOrName ?? "").toLowerCase();
  if (c.includes("pizza") || c.includes("italian")) {
    return {
      categories: [
        {
          name: "Pizzas",
          sort_order: 1,
          items: [
            { name: "Margherita", description: "Tomato, mozzarella, basil", price: 14, base_availability: true, modifiers: [] },
            { name: "Pepperoni", description: "Classic pepperoni and mozzarella", price: 16, base_availability: true, modifiers: [] },
            { name: "Veggie Supreme", description: "Peppers, onions, olives, mushrooms", price: 17, base_availability: true, modifiers: [] },
          ],
        },
        {
          name: "Sides",
          sort_order: 2,
          items: [
            { name: "Garlic Knots", description: "Six knots with marinara", price: 6, base_availability: true, modifiers: [] },
            { name: "Caesar Salad", description: null, price: 9, base_availability: true, modifiers: [] },
          ],
        },
        {
          name: "Drinks",
          sort_order: 3,
          items: [
            { name: "Fountain Soda", description: null, price: 2.5, base_availability: true, modifiers: [] },
          ],
        },
      ],
    };
  }
  if (c.includes("mexican") || c.includes("taco")) {
    return {
      categories: [
        {
          name: "Tacos",
          sort_order: 1,
          items: [
            { name: "Carne Asada Taco", description: "Grilled steak, onion, cilantro", price: 4.5, base_availability: true, modifiers: [] },
            { name: "Al Pastor Taco", description: "Marinated pork, pineapple", price: 4.25, base_availability: true, modifiers: [] },
            { name: "Veggie Taco", description: "Roasted peppers and black beans", price: 4, base_availability: true, modifiers: [] },
          ],
        },
        {
          name: "Plates",
          sort_order: 2,
          items: [
            { name: "Chicken Burrito", description: "Rice, beans, cheese, salsa", price: 12, base_availability: true, modifiers: [] },
            { name: "Chips and Guacamole", description: null, price: 7, base_availability: true, modifiers: [] },
          ],
        },
        {
          name: "Drinks",
          sort_order: 3,
          items: [
            { name: "Horchata", description: null, price: 3.5, base_availability: true, modifiers: [] },
          ],
        },
      ],
    };
  }
  return {
    categories: [
      {
        name: "Mains",
        sort_order: 1,
        items: [
          { name: "House Burger", description: "Cheddar, lettuce, tomato, house sauce", price: 13, base_availability: true, modifiers: [] },
          { name: "Grilled Chicken Sandwich", description: "Pickles and aioli on brioche", price: 12, base_availability: true, modifiers: [] },
          { name: "Garden Bowl", description: "Greens, quinoa, roasted vegetables", price: 11, base_availability: true, modifiers: [] },
        ],
      },
      {
        name: "Sides",
        sort_order: 2,
        items: [
          { name: "Fries", description: null, price: 4.5, base_availability: true, modifiers: [] },
          { name: "Side Salad", description: null, price: 5, base_availability: true, modifiers: [] },
        ],
      },
      {
        name: "Drinks",
        sort_order: 3,
        items: [
          { name: "Iced Tea", description: null, price: 3, base_availability: true, modifiers: [] },
          { name: "Lemonade", description: null, price: 3.5, base_availability: true, modifiers: [] },
        ],
      },
    ],
  };
}
