import { describe, expect, it } from "vitest";
import {
  applyDefaultOrganizationMenuTemplate,
  applyOrganizationMenuTemplateToInheritedRestaurants,
  buildTemplateAdditionsPayload,
  buildTemplateOverrideDiff,
  countMenuPayload,
  markRestaurantMenuTemplateLocalOverride,
  menuSnapshotToMergePayload,
} from "@/lib/menu-editor/copy-menu";
import type { RestaurantMenuSnapshot } from "@/lib/menu-editor/load-menu";

describe("menuSnapshotToMergePayload", () => {
  it("builds a merge_menu payload sorted by menu order", () => {
    const snapshot: RestaurantMenuSnapshot = {
      categories: [
        {
          id: "cat-drinks",
          restaurant_id: "r1",
          name: "Drinks",
          sort_order: 2,
          updated_at: "",
        },
        {
          id: "cat-food",
          restaurant_id: "r1",
          name: "Food",
          sort_order: 1,
          updated_at: "",
        },
      ],
      items: [
        {
          id: "item-soda",
          category_id: "cat-drinks",
          name: "Soda",
          description: null,
          price: 2.5,
          is_available: false,
          sort_order: 1,
          raw_menu_data: null,
          updated_at: "",
        },
        {
          id: "item-burger",
          category_id: "cat-food",
          name: "Burger",
          description: "Cheeseburger",
          price: 12,
          is_available: true,
          sort_order: 1,
          raw_menu_data: null,
          updated_at: "",
        },
      ],
      modifiers: [
        {
          id: "mod-cheese",
          item_id: "item-burger",
          group_name: "Add-ons",
          modifier_name: "Extra cheese",
          extra_price: 1,
          min_selection: 0,
          max_selection: 2,
          sort_order: 1,
          group_sort_order: 1,
        },
      ],
    };

    expect(menuSnapshotToMergePayload(snapshot)).toEqual({
      categories: [
        {
          name: "Food",
          sort_order: 1,
          items: [
            {
              name: "Burger",
              description: "Cheeseburger",
              price: 12,
              base_availability: true,
              modifiers: [
                {
                  group_name: "Add-ons",
                  modifier_name: "Extra cheese",
                  extra_price: 1,
                  min_selection: 0,
                  max_selection: 2,
                },
              ],
            },
          ],
        },
        {
          name: "Drinks",
          sort_order: 2,
          items: [
            {
              name: "Soda",
              description: null,
              price: 2.5,
              base_availability: false,
              modifiers: [],
            },
          ],
        },
      ],
    });
  });

  it("counts categories, items, and modifiers for saved templates", () => {
    const payload = menuSnapshotToMergePayload({
      categories: [
        {
          id: "cat-pizza",
          restaurant_id: "r1",
          name: "Pizza",
          sort_order: 1,
          updated_at: "",
        },
        {
          id: "cat-drinks",
          restaurant_id: "r1",
          name: "Drinks",
          sort_order: 2,
          updated_at: "",
        },
      ],
      items: [
        {
          id: "item-margherita",
          category_id: "cat-pizza",
          name: "Margherita",
          description: null,
          price: 16,
          is_available: true,
          sort_order: 1,
          raw_menu_data: null,
          updated_at: "",
        },
        {
          id: "item-soda",
          category_id: "cat-drinks",
          name: "Soda",
          description: null,
          price: 3,
          is_available: true,
          sort_order: 1,
          raw_menu_data: null,
          updated_at: "",
        },
      ],
      modifiers: [
        {
          id: "mod-gluten-free",
          item_id: "item-margherita",
          group_name: "Crust",
          modifier_name: "Gluten-free crust",
          extra_price: 3,
          min_selection: 0,
          max_selection: 1,
          sort_order: 1,
          group_sort_order: 1,
        },
        {
          id: "mod-extra-cheese",
          item_id: "item-margherita",
          group_name: "Add-ons",
          modifier_name: "Extra cheese",
          extra_price: 2,
          min_selection: 0,
          max_selection: 3,
          sort_order: 1,
          group_sort_order: 2,
        },
      ],
    });

    expect(countMenuPayload(payload)).toEqual({
      categories: 2,
      items: 2,
      modifiers: 2,
    });
  });

  it("builds an additive template payload for customized inherited menus", () => {
    const templatePayload = {
      categories: [
        {
          name: "Pizza",
          sort_order: 1,
          items: [
            {
              name: "Margherita",
              description: "Brand recipe",
              price: 16,
              base_availability: true,
              modifiers: [],
            },
            {
              name: "Sicilian Slice",
              description: "New brand item",
              price: 8,
              base_availability: true,
              modifiers: [
                {
                  group_name: "Add-ons",
                  modifier_name: "Extra cheese",
                  extra_price: 2,
                  min_selection: 0,
                  max_selection: 1,
                },
              ],
            },
          ],
        },
        {
          name: "Dessert",
          sort_order: 3,
          items: [
            {
              name: "Cannoli",
              description: null,
              price: 6,
              base_availability: true,
              modifiers: [],
            },
          ],
        },
      ],
    };
    const targetSnapshot: RestaurantMenuSnapshot = {
      categories: [
        {
          id: "cat-pizza",
          restaurant_id: "restaurant_1",
          name: " Pizza ",
          sort_order: 9,
          updated_at: "",
        },
      ],
      items: [
        {
          id: "item-local-margherita",
          category_id: "cat-pizza",
          name: "margherita",
          description: "Local price and description must stay untouched",
          price: 19,
          is_available: false,
          sort_order: 1,
          raw_menu_data: null,
          updated_at: "",
        },
      ],
      modifiers: [],
    };

    expect(buildTemplateAdditionsPayload(templatePayload, targetSnapshot)).toEqual({
      categories: [
        {
          name: "Pizza",
          sort_order: 9,
          items: [
            {
              name: "Sicilian Slice",
              description: "New brand item",
              price: 8,
              base_availability: true,
              modifiers: [
                {
                  group_name: "Add-ons",
                  modifier_name: "Extra cheese",
                  extra_price: 2,
                  min_selection: 0,
                  max_selection: 1,
                },
              ],
            },
          ],
        },
        {
          name: "Dessert",
          sort_order: 3,
          items: [
            {
              name: "Cannoli",
              description: null,
              price: 6,
              base_availability: true,
              modifiers: [],
            },
          ],
        },
      ],
    });
  });

  it("builds field-level diffs for customized inherited menus", () => {
    const templatePayload = {
      categories: [
        {
          name: "Pizza",
          sort_order: 1,
          items: [
            {
              name: "Margherita",
              description: "Brand recipe",
              price: 16,
              base_availability: true,
              modifiers: [
                {
                  group_name: "Crust",
                  modifier_name: "Gluten-free",
                  extra_price: 3,
                  min_selection: 0,
                  max_selection: 1,
                },
              ],
            },
            {
              name: "Sicilian Slice",
              description: null,
              price: 8,
              base_availability: true,
              modifiers: [],
            },
          ],
        },
        {
          name: "Dessert",
          sort_order: 2,
          items: [
            {
              name: "Cannoli",
              description: null,
              price: 6,
              base_availability: true,
              modifiers: [],
            },
          ],
        },
      ],
    };
    const targetSnapshot: RestaurantMenuSnapshot = {
      categories: [
        {
          id: "cat-pizza",
          restaurant_id: "restaurant_1",
          name: "Pizza",
          sort_order: 1,
          updated_at: "",
        },
      ],
      items: [
        {
          id: "item-margherita",
          category_id: "cat-pizza",
          name: "Margherita",
          description: "Local recipe",
          price: 19,
          is_available: false,
          sort_order: 1,
          raw_menu_data: null,
          updated_at: "",
        },
        {
          id: "item-local",
          category_id: "cat-pizza",
          name: "Campus Special",
          description: null,
          price: 12,
          is_available: true,
          sort_order: 2,
          raw_menu_data: null,
          updated_at: "",
        },
      ],
      modifiers: [
        {
          id: "mod-local",
          item_id: "item-margherita",
          group_name: "Crust",
          modifier_name: "Cauliflower",
          extra_price: 4,
          min_selection: 0,
          max_selection: 1,
          sort_order: 1,
          group_sort_order: 1,
        },
      ],
    };

    expect(buildTemplateOverrideDiff(templatePayload, targetSnapshot)).toEqual({
      missingCategories: ["Dessert"],
      missingItems: [
        { categoryName: "Pizza", itemName: "Sicilian Slice" },
        { categoryName: "Dessert", itemName: "Cannoli" },
      ],
      itemFieldOverrides: [
        {
          categoryName: "Pizza",
          itemName: "Margherita",
          fields: ["description", "price", "availability", "modifiers"],
        },
      ],
      localOnlyItems: [{ categoryName: "Pizza", itemName: "Campus Special" }],
    });
  });

  it("applies the default organization template when one exists", async () => {
    const payload = {
      categories: [
        {
          name: "Pizza",
          sort_order: 1,
          items: [
            {
              name: "Margherita",
              description: null,
              price: 16,
              base_availability: true,
              modifiers: [],
            },
          ],
        },
      ],
    };
    const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const restaurantUpdates: Array<Record<string, unknown>> = [];
    const supabase = {
      from: (table: string) => {
        if (table === "restaurants") {
          return {
            update: (payload: Record<string, unknown>) => {
              restaurantUpdates.push(payload);
              return {
                eq: async (column: string, value: string) => {
                  expect(column).toBe("id");
                  expect(value).toBe("restaurant_2");
                  return { data: null, error: null };
                },
              };
            },
          };
        }
        expect(table).toBe("organization_menu_templates");
        return {
          select: (columns: string) => {
            if (columns === "id, name") {
              return {
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({
                          data: { id: "tpl_1", name: "Brand menu" },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              };
            }
            expect(columns).toBe("menu_payload");
            return {
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { menu_payload: payload },
                    error: null,
                  }),
                }),
              }),
            };
          },
        };
      },
      rpc: async (name: string, args: Record<string, unknown>) => {
        rpcCalls.push({ name, args });
        return name === "merge_menu"
          ? { data: { categories: 1, items: 1, modifiers: 0 }, error: null }
          : { data: null, error: null };
      },
    };

    await expect(
      applyDefaultOrganizationMenuTemplate(supabase as never, {
        organizationId: "org_1",
        targetRestaurantId: "restaurant_2",
      })
    ).resolves.toEqual({
      applied: true,
      templateId: "tpl_1",
      templateName: "Brand menu",
      stats: { categories: 1, items: 1, modifiers: 0 },
    });
    expect(rpcCalls.map((call) => call.name)).toEqual([
      "clear_restaurant_menu",
      "merge_menu",
    ]);
    expect(restaurantUpdates).toHaveLength(1);
    expect(restaurantUpdates[0]).toMatchObject({
      inherited_menu_template_id: "tpl_1",
      inherited_menu_template_override_count: 0,
      inherited_menu_template_last_local_edit_at: null,
    });
    expect(restaurantUpdates[0].inherited_menu_template_applied_at).toEqual(
      expect.any(String)
    );
  });

  it("skips default template inheritance when no default exists", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      }),
      rpc: async () => {
        throw new Error("rpc should not be called");
      },
    };

    await expect(
      applyDefaultOrganizationMenuTemplate(supabase as never, {
        organizationId: "org_1",
        targetRestaurantId: "restaurant_2",
      })
    ).resolves.toEqual({
      applied: false,
      reason: "no_default_template",
    });
  });

  it("bulk applies a template only to locations that inherited it", async () => {
    const payload = {
      categories: [
        {
          name: "Pizza",
          sort_order: 1,
          items: [
            {
              name: "Margherita",
              description: null,
              price: 16,
              base_availability: true,
              modifiers: [],
            },
          ],
        },
      ],
    };
    const rpcCalls: Array<{ name: string; restaurantId: string }> = [];
    const restaurantUpdates: Array<{ restaurantId: string; payload: Record<string, unknown> }> = [];

    const supabase = {
      from: (table: string) => {
        if (table === "restaurants") {
          return {
            select: (columns: string) => {
              expect(columns).toBe("id, name, inherited_menu_template_override_count");
              return {
                eq: (column: string, value: string) => {
                  expect(column).toBe("organization_id");
                  expect(value).toBe("org_1");
                  return {
                    eq: (innerColumn: string, innerValue: string) => {
                      expect(innerColumn).toBe("inherited_menu_template_id");
                      expect(innerValue).toBe("tpl_1");
                      return {
                        order: async (orderColumn: string) => {
                          expect(orderColumn).toBe("name");
                          return {
                            data: [
                              {
                                id: "restaurant_1",
                                name: "Downtown",
                                inherited_menu_template_override_count: 0,
                              },
                              {
                                id: "restaurant_2",
                                name: "Uptown",
                                inherited_menu_template_override_count: 0,
                              },
                              {
                                id: "restaurant_skip",
                                name: "Airport",
                                inherited_menu_template_override_count: 0,
                              },
                              {
                                id: "restaurant_custom",
                                name: "Campus",
                                inherited_menu_template_override_count: 2,
                              },
                            ],
                            error: null,
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
            update: (updatePayload: Record<string, unknown>) => ({
              eq: async (column: string, value: string) => {
                expect(column).toBe("id");
                restaurantUpdates.push({ restaurantId: value, payload: updatePayload });
                return { data: null, error: null };
              },
            }),
          };
        }

        expect(table).toBe("organization_menu_templates");
        return {
          select: (columns: string) => {
            expect(columns).toBe("menu_payload");
            return {
              eq: (column: string, value: string) => {
                expect(column).toBe("id");
                expect(value).toBe("tpl_1");
                return {
                  eq: (innerColumn: string, innerValue: string) => {
                    expect(innerColumn).toBe("organization_id");
                    expect(innerValue).toBe("org_1");
                    return {
                      maybeSingle: async () => ({
                        data: { menu_payload: payload },
                        error: null,
                      }),
                    };
                  },
                };
              },
            };
          },
        };
      },
      rpc: async (name: string, args: Record<string, unknown>) => {
        const restaurantId = String(args.p_restaurant_id);
        rpcCalls.push({ name, restaurantId });
        if (name === "merge_menu" && restaurantId === "restaurant_2") {
          return { data: null, error: { message: "merge failed" } };
        }
        return name === "merge_menu"
          ? { data: { categories: 1, items: 1, modifiers: 0 }, error: null }
          : { data: null, error: null };
      },
    };

    await expect(
      applyOrganizationMenuTemplateToInheritedRestaurants(supabase as never, {
        organizationId: "org_1",
        templateId: "tpl_1",
        excludeRestaurantIds: ["restaurant_skip"],
      })
    ).resolves.toEqual({
      templateId: "tpl_1",
      targetRestaurantIds: ["restaurant_1", "restaurant_2"],
      applied: [
        {
          restaurantId: "restaurant_1",
          restaurantName: "Downtown",
          stats: { categories: 1, items: 1, modifiers: 0 },
          mode: "replace",
        },
      ],
      skipped: [
        {
          restaurantId: "restaurant_skip",
          restaurantName: "Airport",
          reason: "excluded",
          overrideCount: 0,
        },
        {
          restaurantId: "restaurant_custom",
          restaurantName: "Campus",
          reason: "local_override",
          overrideCount: 2,
        },
      ],
      failed: [
        {
          restaurantId: "restaurant_2",
          restaurantName: "Uptown",
          error: "Apply menu template failed: merge failed",
        },
      ],
    });

    expect(rpcCalls).toEqual([
      { name: "clear_restaurant_menu", restaurantId: "restaurant_1" },
      { name: "merge_menu", restaurantId: "restaurant_1" },
      { name: "clear_restaurant_menu", restaurantId: "restaurant_2" },
      { name: "merge_menu", restaurantId: "restaurant_2" },
    ]);
    expect(restaurantUpdates).toHaveLength(1);
    expect(restaurantUpdates[0]).toMatchObject({
      restaurantId: "restaurant_1",
      payload: {
        inherited_menu_template_id: "tpl_1",
        inherited_menu_template_override_count: 0,
        inherited_menu_template_last_local_edit_at: null,
      },
    });
  });

  it("marks local overrides only when a restaurant inherited a template", async () => {
    const restaurantUpdates: Array<Record<string, unknown>> = [];
    const supabase = {
      from: (table: string) => {
        expect(table).toBe("restaurants");
        return {
          select: (columns: string) => {
            expect(columns).toBe(
              "inherited_menu_template_id, inherited_menu_template_override_count"
            );
            return {
              eq: (column: string, value: string) => {
                expect(column).toBe("id");
                expect(value).toBe("restaurant_1");
                return {
                  maybeSingle: async () => ({
                    data: {
                      inherited_menu_template_id: "tpl_1",
                      inherited_menu_template_override_count: 2,
                    },
                    error: null,
                  }),
                };
              },
            };
          },
          update: (payload: Record<string, unknown>) => {
            restaurantUpdates.push(payload);
            return {
              eq: async (column: string, value: string) => {
                expect(column).toBe("id");
                expect(value).toBe("restaurant_1");
                return { data: null, error: null };
              },
            };
          },
        };
      },
    };

    await expect(
      markRestaurantMenuTemplateLocalOverride(supabase as never, "restaurant_1")
    ).resolves.toEqual({
      marked: true,
      templateId: "tpl_1",
      overrideCount: 3,
    });

    expect(restaurantUpdates).toHaveLength(1);
    expect(restaurantUpdates[0]).toMatchObject({
      inherited_menu_template_override_count: 3,
    });
    expect(
      restaurantUpdates[0].inherited_menu_template_last_local_edit_at
    ).toEqual(expect.any(String));
  });
});
