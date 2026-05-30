"use server";

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import {
  assertCategoryNameAvailable,
  assertItemNameAvailable,
} from "@/lib/menu-editor/duplicates.server";
import { mapMenuDbError } from "@/lib/menu-editor/errors";
import { assertCategoryInRestaurant, assertItemInRestaurant } from "@/lib/menu-editor/scope";
import {
  aggregateModifierGroups,
  findDuplicateGroupInList,
  modifierBelongsToGroup,
  rowsFromGroupInput,
  resolveGroupSelectionBounds,
} from "@/lib/menu-editor/modifier-groups";
import {
  ModifierGroupInputSchema,
  ReorderModifierGroupsSchema,
  type ModifierGroupInput,
} from "@/lib/menu-editor/modifier-group-schema";
import { ModifierInputSchema, type ModifierInput } from "@/lib/menu-editor/schema";
import {
  CategoryInputSchema,
  ItemInputSchema,
  ReorderCategoriesSchema,
  ReorderItemsSchema,
  firstZodMessage,
  type CategoryInput,
  type ItemInput,
} from "@/lib/menu-editor/validation";
import { createServerSupabase } from "@/lib/supabase/server";
import type { DbCategory, DbItem, DbModifier } from "@/lib/types";
import { afterMenuContentMutation } from "@/lib/voice-agent/after-menu-content-mutation";

async function nextItemSortOrder(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  categoryId: string
): Promise<number> {
  const { data: maxRow } = await supabase
    .from("items")
    .select("sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return maxRow?.sort_order != null ? Number(maxRow.sort_order) + 1 : 1;
}

export async function saveCategoryAction(
  restaurantId: string,
  raw: CategoryInput
) {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const parsed = CategoryInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }

  const supabase = await createServerSupabase();
  const input = parsed.data;
  const now = new Date().toISOString();

  await assertCategoryNameAvailable(
    supabase,
    restaurantId,
    input.name,
    input.id
  );

  if (input.id) {
    await assertCategoryInRestaurant(supabase, restaurantId, input.id);

    const { data, error } = await supabase
      .from("categories")
      .update({
        name: input.name,
        sort_order: input.sort_order,
        updated_at: now,
      })
      .eq("id", input.id)
      .eq("restaurant_id", restaurantId)
      .select("*")
      .single();

    if (error) throw new Error(mapMenuDbError(error, "category"));
    afterMenuContentMutation(restaurantId, { userId: access.context.user.id });
    return { ok: true as const, category: data as DbCategory };
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      sort_order: input.sort_order,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(mapMenuDbError(error, "category"));
  afterMenuContentMutation(restaurantId, { userId: access.context.user.id });
  return { ok: true as const, category: data as DbCategory };
}

export async function reorderCategoriesAction(
  restaurantId: string,
  raw: { order: { id: string; sort_order: number }[] }
) {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const parsed = ReorderCategoriesSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }

  const supabase = await createServerSupabase();
  const now = new Date().toISOString();

  for (const row of parsed.data.order) {
    await assertCategoryInRestaurant(supabase, restaurantId, row.id);
    const { error } = await supabase
      .from("categories")
      .update({ sort_order: row.sort_order, updated_at: now })
      .eq("id", row.id)
      .eq("restaurant_id", restaurantId);

    if (error) throw new Error(mapMenuDbError(error, "category"));
  }

  afterMenuContentMutation(restaurantId, { userId: access.context.user.id });
  return { ok: true as const };
}

export async function deleteCategoryAction(
  restaurantId: string,
  categoryId: string
) {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const supabase = await createServerSupabase();
  await assertCategoryInRestaurant(supabase, restaurantId, categoryId);

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("restaurant_id", restaurantId);

  if (error) throw new Error(mapMenuDbError(error, "category"));
  afterMenuContentMutation(restaurantId, { userId: access.context.user.id });
  return { ok: true as const };
}

export async function saveItemAction(restaurantId: string, raw: ItemInput) {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const parsed = ItemInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }

  const supabase = await createServerSupabase();
  const input = parsed.data;
  const now = new Date().toISOString();

  await assertCategoryInRestaurant(supabase, restaurantId, input.category_id);
  await assertItemNameAvailable(
    supabase,
    input.category_id,
    input.name,
    input.id
  );

  if (input.id) {
    await assertItemInRestaurant(supabase, restaurantId, input.id);
  }

  const sortOrder =
    input.sort_order ??
    (input.id
      ? undefined
      : await nextItemSortOrder(supabase, input.category_id));

  let resolvedSort = sortOrder;
  if (input.id && resolvedSort == null) {
    const { data: existing } = await supabase
      .from("items")
      .select("sort_order")
      .eq("id", input.id)
      .maybeSingle();
    resolvedSort = existing?.sort_order != null ? Number(existing.sort_order) : 1;
  }
  if (resolvedSort == null) resolvedSort = 1;

  const payload = {
    category_id: input.category_id,
    name: input.name,
    description: input.description ?? null,
    price: input.price,
    is_available: input.is_available,
    sort_order: resolvedSort,
    updated_at: now,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("items")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw new Error(mapMenuDbError(error, "item"));
    afterMenuContentMutation(restaurantId, { userId: access.context.user.id });
    return { ok: true as const, item: data as DbItem };
  }

  const { data, error } = await supabase
    .from("items")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(mapMenuDbError(error, "item"));
  afterMenuContentMutation(restaurantId, { userId: access.context.user.id });
  return { ok: true as const, item: data as DbItem };
}

export async function reorderItemsAction(
  restaurantId: string,
  raw: { category_id: string; order: { id: string; sort_order: number }[] }
) {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const parsed = ReorderItemsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }

  const supabase = await createServerSupabase();
  await assertCategoryInRestaurant(
    supabase,
    restaurantId,
    parsed.data.category_id
  );

  const now = new Date().toISOString();

  for (const row of parsed.data.order) {
    const item = await assertItemInRestaurant(supabase, restaurantId, row.id);
    if (item.category_id !== parsed.data.category_id) {
      throw new Error("Item does not belong to this category.");
    }

    const { error } = await supabase
      .from("items")
      .update({ sort_order: row.sort_order, updated_at: now })
      .eq("id", row.id);

    if (error) throw new Error(mapMenuDbError(error, "item"));
  }

  afterMenuContentMutation(restaurantId, { userId: access.context.user.id });
  return { ok: true as const };
}

export async function deleteItemAction(restaurantId: string, itemId: string) {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const supabase = await createServerSupabase();
  await assertItemInRestaurant(supabase, restaurantId, itemId);

  const { error } = await supabase.from("items").delete().eq("id", itemId);

  if (error) throw new Error(mapMenuDbError(error, "item"));
  afterMenuContentMutation(restaurantId, { userId: access.context.user.id });
  return { ok: true as const };
}

/** @deprecated Use saveModifierGroupAction — single-row save for legacy callers. */
export async function saveModifierAction(
  restaurantId: string,
  raw: ModifierInput
) {
  const parsed = ModifierInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }
  const input = parsed.data;
  return saveModifierGroupAction(restaurantId, {
    item_id: input.item_id,
    group_name: input.group_name,
    is_required: input.min_selection >= 1,
    min_selection: input.min_selection,
    max_selection: input.max_selection,
    options: [
      {
        id: input.id,
        modifier_name: input.modifier_name,
        extra_price: input.extra_price,
        sort_order: 1,
      },
    ],
  });
}

export async function saveModifierGroupAction(
  restaurantId: string,
  raw: ModifierGroupInput
) {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const parsed = ModifierGroupInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }

  const supabase = await createServerSupabase();
  const input = parsed.data;

  await assertItemInRestaurant(supabase, restaurantId, input.item_id);

  const { data: existingMods, error: loadErr } = await supabase
    .from("modifiers")
    .select("*")
    .eq("item_id", input.item_id);

  if (loadErr) throw new Error(loadErr.message);

  const existingGroups = aggregateModifierGroups(
    (existingMods ?? []) as DbModifier[]
  );
  const dupGroup = findDuplicateGroupInList(
    existingGroups,
    input.item_id,
    input.group_name,
    input.previous_group_name
  );
  if (dupGroup) {
    throw new Error(
      `A modifier group named "${dupGroup.group_name}" already exists on this item.`
    );
  }

  const bounds = resolveGroupSelectionBounds({
    is_required: input.is_required,
    min_selection: input.min_selection,
    max_selection: input.max_selection,
    optionCount: input.options.length,
  });

  const deleteLabel = input.previous_group_name ?? input.group_name;
  const idsToDelete = ((existingMods ?? []) as DbModifier[])
    .filter((m) => modifierBelongsToGroup(m, input.item_id, deleteLabel))
    .map((m) => m.id);

  if (idsToDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("modifiers")
      .delete()
      .in("id", idsToDelete);

    if (delErr) throw new Error(delErr.message);
  }

  const rows = rowsFromGroupInput(input, bounds);
  const { data, error } = await supabase
    .from("modifiers")
    .insert(rows)
    .select("*");

  if (error) throw new Error(error.message);

  afterMenuContentMutation(restaurantId, { userId: access.context.user.id });
  return {
    ok: true as const,
    modifiers: (data ?? []) as DbModifier[],
    group: aggregateModifierGroups((data ?? []) as DbModifier[])[0] ?? null,
  };
}

export async function deleteModifierGroupAction(
  restaurantId: string,
  itemId: string,
  groupName: string
) {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const supabase = await createServerSupabase();
  await assertItemInRestaurant(supabase, restaurantId, itemId);

  const { data: existing, error: loadErr } = await supabase
    .from("modifiers")
    .select("id, item_id, group_name")
    .eq("item_id", itemId);

  if (loadErr) throw new Error(loadErr.message);

  const idsToDelete = ((existing ?? []) as Pick<DbModifier, "id" | "item_id" | "group_name">[])
    .filter((m) => modifierBelongsToGroup(m, itemId, groupName))
    .map((m) => m.id);

  if (idsToDelete.length > 0) {
    const { error } = await supabase.from("modifiers").delete().in("id", idsToDelete);
    if (error) throw new Error(error.message);
  }
  afterMenuContentMutation(restaurantId, { userId: access.context.user.id });
  return { ok: true as const };
}

export async function reorderModifierGroupsAction(
  restaurantId: string,
  raw: { item_id: string; order: { group_name: string; group_sort_order: number }[] }
) {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const parsed = ReorderModifierGroupsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }

  const supabase = await createServerSupabase();
  await assertItemInRestaurant(supabase, restaurantId, parsed.data.item_id);

  const { data: existing, error: loadErr } = await supabase
    .from("modifiers")
    .select("id, item_id, group_name")
    .eq("item_id", parsed.data.item_id);

  if (loadErr) throw new Error(loadErr.message);

  for (const row of parsed.data.order) {
    const ids = (
      (existing ?? []) as Pick<DbModifier, "id" | "item_id" | "group_name">[]
    )
      .filter((m) =>
        modifierBelongsToGroup(m, parsed.data.item_id, row.group_name)
      )
      .map((m) => m.id);

    if (ids.length === 0) continue;

    const { error } = await supabase
      .from("modifiers")
      .update({ group_sort_order: row.group_sort_order })
      .in("id", ids);

    if (error) throw new Error(error.message);
  }

  afterMenuContentMutation(restaurantId, { userId: access.context.user.id });
  return { ok: true as const };
}

/** @deprecated Use deleteModifierGroupAction */
export async function deleteModifierAction(
  restaurantId: string,
  modifierId: string
) {
  const supabase = await createServerSupabase();
  const { data: mod } = await supabase
    .from("modifiers")
    .select("item_id, group_name")
    .eq("id", modifierId)
    .maybeSingle();

  if (!mod) throw new Error("Modifier not found.");
  return deleteModifierGroupAction(
    restaurantId,
    mod.item_id as string,
    mod.group_name as string
  );
}
