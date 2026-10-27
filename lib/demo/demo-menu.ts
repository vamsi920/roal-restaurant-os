/**
 * Fictional menu for the demo workspace ("Maria's Trattoria", Austin TX).
 * Shape matches the `merge_menu` RPC payload.
 */

export type DemoMenuModifier = {
  group_name: string;
  modifier_name: string;
  extra_price: number;
  min_selection?: number;
  max_selection?: number;
};

export type DemoMenuItem = {
  name: string;
  description: string;
  price: number;
  modifiers?: DemoMenuModifier[];
};

export type DemoMenuCategory = { name: string; items: DemoMenuItem[] };

const pizzaToppings = (): DemoMenuModifier[] => [
  { group_name: "Add toppings", modifier_name: "Extra mozzarella", extra_price: 2.5, max_selection: 4 },
  { group_name: "Add toppings", modifier_name: "Calabrian chili", extra_price: 1.25, max_selection: 4 },
  { group_name: "Add toppings", modifier_name: "Roasted mushrooms", extra_price: 2.25, max_selection: 4 },
  { group_name: "Add toppings", modifier_name: "Fresh basil", extra_price: 0.75, max_selection: 4 },
  { group_name: "Crust", modifier_name: "Classic", extra_price: 0, min_selection: 1, max_selection: 1 },
  { group_name: "Crust", modifier_name: "Gluten-free", extra_price: 3, min_selection: 1, max_selection: 1 },
];

const pastaProtein = (): DemoMenuModifier[] => [
  { group_name: "Add protein", modifier_name: "Grilled chicken", extra_price: 5, max_selection: 1 },
  { group_name: "Add protein", modifier_name: "Garlic shrimp", extra_price: 7.5, max_selection: 1 },
  { group_name: "Add protein", modifier_name: "Italian sausage", extra_price: 4.5, max_selection: 1 },
  { group_name: "Pasta swap", modifier_name: "Gluten-free penne", extra_price: 2.5, max_selection: 1 },
];

export const DEMO_MENU: DemoMenuCategory[] = [
  {
    name: "Antipasti",
    items: [
      { name: "Garlic Knots", description: "Six knots, garlic butter, parmesan, marinara for dipping.", price: 6.75 },
      { name: "Bruschetta al Pomodoro", description: "Grilled ciabatta, tomato, basil, aged balsamic.", price: 9.5 },
      { name: "Fried Calamari", description: "Lemon aioli and spicy marinara.", price: 14.25 },
      { name: "Burrata & Prosciutto", description: "Creamy burrata, prosciutto di Parma, grilled bread.", price: 16.5 },
    ],
  },
  {
    name: "Insalate",
    items: [
      {
        name: "Caesar Salad",
        description: "Romaine, house Caesar, parmesan crisp, croutons.",
        price: 11.25,
        modifiers: [{ group_name: "Add protein", modifier_name: "Grilled chicken", extra_price: 5, max_selection: 1 }],
      },
      { name: "Caprese", description: "Heirloom tomato, fresh mozzarella, basil, olive oil.", price: 12.75 },
      { name: "Arugula & Pear", description: "Gorgonzola, candied walnuts, honey vinaigrette.", price: 11.5 },
    ],
  },
  {
    name: "Pizza",
    items: [
      { name: "Margherita", description: '12" Neapolitan, San Marzano tomato, fior di latte, basil.', price: 15.5, modifiers: pizzaToppings() },
      { name: "Pepperoni", description: '12" cup-and-char pepperoni, mozzarella, oregano.', price: 17.25, modifiers: pizzaToppings() },
      { name: "Quattro Formaggi", description: "Mozzarella, gorgonzola, fontina, parmesan.", price: 18.5, modifiers: pizzaToppings() },
      { name: "Salsiccia & Peppers", description: "Fennel sausage, roasted peppers, red onion.", price: 18.75, modifiers: pizzaToppings() },
      { name: "Funghi", description: "Wild mushrooms, truffle oil, thyme, fontina.", price: 17.95, modifiers: pizzaToppings() },
    ],
  },
  {
    name: "Pasta",
    items: [
      { name: "Spaghetti Carbonara", description: "Guanciale, egg yolk, pecorino, black pepper.", price: 18.95, modifiers: pastaProtein() },
      { name: "Fettuccine Alfredo", description: "Parmesan cream sauce, fresh fettuccine.", price: 17.5, modifiers: pastaProtein() },
      { name: "Penne alla Vodka", description: "Tomato cream, vodka, chili flake.", price: 17.25, modifiers: pastaProtein() },
      { name: "Lasagna della Nonna", description: "Beef & pork ragù, béchamel, baked to order.", price: 19.75 },
      { name: "Gnocchi al Pesto", description: "Potato gnocchi, basil pesto, pine nuts.", price: 18.25, modifiers: pastaProtein() },
      { name: "Linguine alle Vongole", description: "Littleneck clams, white wine, garlic, parsley.", price: 22.5 },
    ],
  },
  {
    name: "Secondi",
    items: [
      { name: "Chicken Parmigiana", description: "Breaded cutlet, marinara, mozzarella, side of spaghetti.", price: 22.95 },
      { name: "Eggplant Parmigiana", description: "Layered eggplant, marinara, mozzarella, side salad.", price: 19.5 },
      { name: "Veal Marsala", description: "Mushroom Marsala sauce, roasted potatoes.", price: 27.5 },
    ],
  },
  {
    name: "Dolci",
    items: [
      { name: "Tiramisu", description: "Espresso-soaked ladyfingers, mascarpone, cocoa.", price: 9.25 },
      { name: "Cannoli", description: "Two shells, ricotta, pistachio, chocolate chips.", price: 7.5 },
      { name: "Panna Cotta", description: "Vanilla bean, seasonal berry compote.", price: 8.75 },
    ],
  },
  {
    name: "Bevande",
    items: [
      { name: "San Pellegrino", description: "750ml sparkling water.", price: 3.75 },
      { name: "Italian Soda", description: "Blood orange, lemon, or cherry.", price: 4.25 },
    ],
  },
];

export function demoMenuRpcPayload() {
  return {
    categories: DEMO_MENU.map((cat, ci) => ({
      name: cat.name,
      sort_order: ci + 1,
      items: cat.items.map((item, ii) => ({
        name: item.name,
        description: item.description,
        price: item.price,
        base_availability: true,
        sort_order: ii + 1,
        modifiers: item.modifiers ?? [],
      })),
    })),
  };
}

export function demoMenuPrice(name: string): number {
  for (const cat of DEMO_MENU) {
    const hit = cat.items.find((i) => i.name === name);
    if (hit) return hit.price;
  }
  throw new Error(`Unknown demo menu item: ${name}`);
}

export function demoMenuItemCount(): number {
  return DEMO_MENU.reduce((n, c) => n + c.items.length, 0);
}
