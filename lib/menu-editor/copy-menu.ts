import type { SupabaseClient } from "@supabase/supabase-js";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import type { RestaurantMenuSnapshot } from "@/lib/menu-editor/load-menu";
import { MenuSchema, type DbItem, type Menu } from "@/lib/types";

export type CopyMenuResult = {
  categories: number;
  items: number;
  modifiers: number;
};

export type OrganizationMenuTemplate = {
  id: string;
  organization_id: string;
  source_restaurant_id: string | null;
  name: string;
  category_count: number;
  item_count: number;
  modifier_count: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type ApplyTemplateToInheritedRestaurantResult = {
  restaurantId: string;
  restaurantName: string | null;
  stats: CopyMenuResult;
  mode?: "replace" | "add_missing";
  diff?: TemplateOverrideDiff;
};

export type SkippedInheritedRestaurant = {
  restaurantId: string;
  restaurantName: string | null;
  reason: "excluded" | "local_override";
  overrideCount: number;
};

export type ApplyTemplateToInheritedRestaurantsResult = {
  templateId: string;
  targetRestaurantIds: string[];
  applied: ApplyTemplateToInheritedRestaurantResult[];
  skipped: SkippedInheritedRestaurant[];
  failed: Array<{
    restaurantId: string;
    restaurantName: string | null;
    error: string;
  }>;
};

export type LocalOverrideTemplateStrategy = "skip" | "add_missing" | "replace";

export type TemplateItemFieldOverride = {
  categoryName: string;
  itemName: string;
  fields: Array<"description" | "price" | "availability" | "modifiers">;
};

export type TemplateOverrideDiff = {
  missingCategories: string[];
  missingItems: Array<{ categoryName: string; itemName: string }>;
  itemFieldOverrides: TemplateItemFieldOverride[];
  localOnlyItems: Array<{ categoryName: string; itemName: string }>;
};

export type MarkMenuTemplateOverrideResult =
  | {
      marked: true;
      templateId: string;
      overrideCount: number;
    }
  | {
      marked: false;
      reason: "not_inherited" | "not_found" | "not_configured";
    };

export function menuSnapshotToMergePayload(
  snapshot: RestaurantMenuSnapshot
): Menu {
  const itemsByCategory = new Map(
    snapshot.categories.map((category) => [
      category.id,
      snapshot.items
        .filter((item) => item.category_id === category.id)
        .sort(
          (a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
            a.name.localeCompare(b.name)
        ),
    ])
  );
  const modifiersByItem = new Map(
    snapshot.items.map((item) => [
      item.id,
      snapshot.modifiers
        .filter((modifier) => modifier.item_id === item.id)
        .sort(
          (a, b) =>
            (a.group_sort_order ?? 0) - (b.group_sort_order ?? 0) ||
            (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
            a.modifier_name.localeCompare(b.modifier_name)
        ),
    ])
  );

  return MenuSchema.parse({
    categories: [...snapshot.categories]
      .sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.name.localeCompare(b.name)
      )
      .map((category, categoryIndex) => ({
        name: category.name,
        sort_order: category.sort_order ?? categoryIndex + 1,
        items: (itemsByCategory.get(category.id) ?? []).map((item) => ({
          name: item.name,
          description: item.description ?? null,
          price: item.price,
          base_availability: item.is_available,
          modifiers: (modifiersByItem.get(item.id) ?? []).map((modifier) => ({
            group_name: modifier.group_name,
            modifier_name: modifier.modifier_name,
            extra_price: modifier.extra_price,
            min_selection: modifier.min_selection,
            max_selection: modifier.max_selection,
          })),
        })),
      })),
  });
}

export function countMenuPayload(payload: Menu): CopyMenuResult {
  let items = 0;
  let modifiers = 0;
  for (const category of payload.categories) {
    items += category.items.length;
    for (const item of category.items) {
      modifiers += item.modifiers.length;
    }
  }
  return {
    categories: payload.categories.length,
    items,
    modifiers,
  };
}

function normalizedMenuName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizedModifierSignature(
  modifiers: Menu["categories"][number]["items"][number]["modifiers"]
): string {
  return modifiers
    .map((modifier) => ({
      group_name: normalizedMenuName(modifier.group_name),
      modifier_name: normalizedMenuName(modifier.modifier_name),
      extra_price: Number(modifier.extra_price ?? 0),
      min_selection: Number(modifier.min_selection ?? 0),
      max_selection: Number(modifier.max_selection ?? 0),
    }))
    .sort(
      (a, b) =>
        a.group_name.localeCompare(b.group_name) ||
        a.modifier_name.localeCompare(b.modifier_name) ||
        a.extra_price - b.extra_price ||
        a.min_selection - b.min_selection ||
        a.max_selection - b.max_selection
    )
    .map(
      (modifier) =>
        `${modifier.group_name}:${modifier.modifier_name}:${modifier.extra_price}:${modifier.min_selection}:${modifier.max_selection}`
    )
    .join("|");
}

export function buildTemplateOverrideDiff(
  templatePayload: Menu,
  targetSnapshot: RestaurantMenuSnapshot
): TemplateOverrideDiff {
  const targetPayload = menuSnapshotToMergePayload(targetSnapshot);
  const targetCategoryByName = new Map(
    targetPayload.categories.map((category) => [
      normalizedMenuName(category.name),
      category,
    ])
  );
  const templateCategoryKeys = new Set(
    templatePayload.categories.map((category) => normalizedMenuName(category.name))
  );
  const missingCategories: string[] = [];
  const missingItems: TemplateOverrideDiff["missingItems"] = [];
  const itemFieldOverrides: TemplateItemFieldOverride[] = [];
  const localOnlyItems: TemplateOverrideDiff["localOnlyItems"] = [];

  for (const templateCategory of templatePayload.categories) {
    const categoryKey = normalizedMenuName(templateCategory.name);
    const targetCategory = targetCategoryByName.get(categoryKey);
    if (!targetCategory) {
      missingCategories.push(templateCategory.name);
      for (const item of templateCategory.items) {
        missingItems.push({
          categoryName: templateCategory.name,
          itemName: item.name,
        });
      }
      continue;
    }

    const targetItemsByName = new Map(
      targetCategory.items.map((item) => [normalizedMenuName(item.name), item])
    );
    const templateItemKeys = new Set(
      templateCategory.items.map((item) => normalizedMenuName(item.name))
    );

    for (const templateItem of templateCategory.items) {
      const targetItem = targetItemsByName.get(normalizedMenuName(templateItem.name));
      if (!targetItem) {
        missingItems.push({
          categoryName: templateCategory.name,
          itemName: templateItem.name,
        });
        continue;
      }

      const fields: TemplateItemFieldOverride["fields"] = [];
      if ((targetItem.description ?? null) !== (templateItem.description ?? null)) {
        fields.push("description");
      }
      if (Number(targetItem.price) !== Number(templateItem.price)) {
        fields.push("price");
      }
      if (
        Boolean(targetItem.base_availability) !==
        Boolean(templateItem.base_availability)
      ) {
        fields.push("availability");
      }
      if (
        normalizedModifierSignature(targetItem.modifiers) !==
        normalizedModifierSignature(templateItem.modifiers)
      ) {
        fields.push("modifiers");
      }
      if (fields.length > 0) {
        itemFieldOverrides.push({
          categoryName: templateCategory.name,
          itemName: templateItem.name,
          fields,
        });
      }
    }

    for (const targetItem of targetCategory.items) {
      if (templateItemKeys.has(normalizedMenuName(targetItem.name))) continue;
      localOnlyItems.push({
        categoryName: targetCategory.name,
        itemName: targetItem.name,
      });
    }
  }

  for (const targetCategory of targetPayload.categories) {
    if (templateCategoryKeys.has(normalizedMenuName(targetCategory.name))) continue;
    for (const targetItem of targetCategory.items) {
      localOnlyItems.push({
        categoryName: targetCategory.name,
        itemName: targetItem.name,
      });
    }
  }

  return {
    missingCategories,
    missingItems,
    itemFieldOverrides,
    localOnlyItems,
  };
}

export function buildTemplateAdditionsPayload(
  templatePayload: Menu,
  targetSnapshot: RestaurantMenuSnapshot
): Menu {
  const targetCategoryByName = new Map(
    targetSnapshot.categories.map((category) => [
      normalizedMenuName(category.name),
      category,
    ])
  );
  const targetItemsByCategoryName = new Map<string, Set<string>>();

  for (const category of targetSnapshot.categories) {
    targetItemsByCategoryName.set(normalizedMenuName(category.name), new Set());
  }
  for (const item of targetSnapshot.items) {
    const category = targetSnapshot.categories.find(
      (candidate) => candidate.id === item.category_id
    );
    if (!category) continue;
    targetItemsByCategoryName
      .get(normalizedMenuName(category.name))
      ?.add(normalizedMenuName(item.name));
  }

  return MenuSchema.parse({
    categories: templatePayload.categories
      .map((category) => {
        const categoryKey = normalizedMenuName(category.name);
        const existingCategory = targetCategoryByName.get(categoryKey);
        const existingItems =
          targetItemsByCategoryName.get(categoryKey) ?? new Set<string>();
        const items = existingCategory
          ? category.items.filter(
              (item) => !existingItems.has(normalizedMenuName(item.name))
            )
          : category.items;

        if (items.length === 0) return null;

        return {
          name: category.name,
          sort_order: existingCategory?.sort_order ?? category.sort_order,
          items,
        };
      })
      .filter((category): category is NonNullable<typeof category> => category != null),
  });
}

export async function copyRestaurantMenu(
  supabase: SupabaseClient,
  input: {
    sourceRestaurantId: string;
    targetRestaurantId: string;
  }
): Promise<CopyMenuResult> {
  const sourceRestaurantId = input.sourceRestaurantId.trim();
  const targetRestaurantId = input.targetRestaurantId.trim();
  if (!sourceRestaurantId || !targetRestaurantId) {
    throw new Error("Source and target restaurants are required.");
  }
  if (sourceRestaurantId === targetRestaurantId) {
    throw new Error("Choose a different source restaurant.");
  }

  const sourceMenu = await loadRestaurantMenu(supabase, sourceRestaurantId);
  if (sourceMenu.categories.length === 0) {
    throw new Error("Source restaurant has no menu to copy.");
  }

  const payload = menuSnapshotToMergePayload(sourceMenu);

  const { error: clearError } = await supabase.rpc("clear_restaurant_menu", {
    p_restaurant_id: targetRestaurantId,
  });
  if (clearError) {
    throw new Error(`Clear target menu failed: ${clearError.message}`);
  }

  const { data, error } = await supabase.rpc("merge_menu", {
    p_restaurant_id: targetRestaurantId,
    p_menu: payload,
  });
  if (error) {
    throw new Error(`Copy menu failed: ${error.message}`);
  }

  await clearRestaurantMenuTemplateInheritance(supabase, targetRestaurantId);

  const stats =
    data && typeof data === "object"
      ? (data as Partial<CopyMenuResult>)
      : {};
  return {
    categories: Number(stats.categories ?? 0),
    items: Number(stats.items ?? 0),
    modifiers: Number(stats.modifiers ?? 0),
  };
}

export async function listOrganizationMenuTemplates(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrganizationMenuTemplate[]> {
  const orgId = organizationId.trim();
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("organization_menu_templates")
    .select(
      "id, organization_id, source_restaurant_id, name, category_count, item_count, modifier_count, is_default, created_at, updated_at"
    )
    .eq("organization_id", orgId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    const msg = error.message ?? "";
    if (/organization_menu_templates/i.test(msg)) return [];
    throw new Error(error.message);
  }

  return ((data ?? []) as OrganizationMenuTemplate[]).map((row) => ({
    ...row,
    category_count: Number(row.category_count ?? 0),
    item_count: Number(row.item_count ?? 0),
    modifier_count: Number(row.modifier_count ?? 0),
    is_default: Boolean(row.is_default),
  }));
}

export async function saveRestaurantMenuAsTemplate(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    organizationId: string;
    name: string;
    userId: string | null;
    makeDefault?: boolean;
  }
): Promise<OrganizationMenuTemplate> {
  const restaurantId = input.restaurantId.trim();
  const organizationId = input.organizationId.trim();
  const name = input.name.trim();
  if (!restaurantId || !organizationId) {
    throw new Error("Restaurant and organization are required.");
  }
  if (name.length < 2 || name.length > 80) {
    throw new Error("Template name must be 2-80 characters.");
  }

  const menu = await loadRestaurantMenu(supabase, restaurantId);
  if (menu.categories.length === 0) {
    throw new Error("Add menu categories before saving a template.");
  }

  const payload = menuSnapshotToMergePayload(menu);
  const counts = countMenuPayload(payload);
  const now = new Date().toISOString();
  const makeDefault = input.makeDefault === true;

  if (makeDefault) {
    const { error: clearDefaultError } = await supabase
      .from("organization_menu_templates")
      .update({ is_default: false, updated_at: now })
      .eq("organization_id", organizationId)
      .eq("is_default", true);

    if (clearDefaultError) {
      throw new Error(`Clear default menu template failed: ${clearDefaultError.message}`);
    }
  }

  const { data, error } = await supabase
    .from("organization_menu_templates")
    .upsert(
      {
        organization_id: organizationId,
        source_restaurant_id: restaurantId,
        name,
        menu_payload: payload,
        category_count: counts.categories,
        item_count: counts.items,
        modifier_count: counts.modifiers,
        is_default: makeDefault,
        created_by: input.userId,
        updated_at: now,
      },
      { onConflict: "organization_id,name" }
    )
    .select(
      "id, organization_id, source_restaurant_id, name, category_count, item_count, modifier_count, is_default, created_at, updated_at"
    )
    .single();

  if (error) throw new Error(`Save menu template failed: ${error.message}`);
  return data as OrganizationMenuTemplate;
}

export async function setDefaultOrganizationMenuTemplate(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    templateId: string;
  }
): Promise<OrganizationMenuTemplate> {
  const organizationId = input.organizationId.trim();
  const templateId = input.templateId.trim();
  if (!organizationId || !templateId) {
    throw new Error("Template and organization are required.");
  }

  const now = new Date().toISOString();
  const { error: clearError } = await supabase
    .from("organization_menu_templates")
    .update({ is_default: false, updated_at: now })
    .eq("organization_id", organizationId)
    .eq("is_default", true);

  if (clearError) {
    throw new Error(`Clear default menu template failed: ${clearError.message}`);
  }

  const { data, error } = await supabase
    .from("organization_menu_templates")
    .update({ is_default: true, updated_at: now })
    .eq("id", templateId)
    .eq("organization_id", organizationId)
    .select(
      "id, organization_id, source_restaurant_id, name, category_count, item_count, modifier_count, is_default, created_at, updated_at"
    )
    .single();

  if (error) throw new Error(`Set default menu template failed: ${error.message}`);
  return data as OrganizationMenuTemplate;
}

export async function loadOrganizationMenuTemplatePayload(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    templateId: string;
  }
): Promise<Menu> {
  const { data: template, error: templateError } = await supabase
    .from("organization_menu_templates")
    .select("menu_payload")
    .eq("id", input.templateId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (templateError) {
    throw new Error(`Load menu template failed: ${templateError.message}`);
  }
  if (!template) throw new Error("Menu template not found.");

  return MenuSchema.parse(template.menu_payload);
}

export async function applyOrganizationMenuTemplateAdditions(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    templateId: string;
    targetRestaurantId: string;
  }
): Promise<CopyMenuResult & { diff: TemplateOverrideDiff }> {
  const organizationId = input.organizationId.trim();
  const templateId = input.templateId.trim();
  const targetRestaurantId = input.targetRestaurantId.trim();
  if (!organizationId || !templateId || !targetRestaurantId) {
    throw new Error("Template and target restaurant are required.");
  }

  const [templatePayload, targetMenu] = await Promise.all([
    loadOrganizationMenuTemplatePayload(supabase, { organizationId, templateId }),
    loadRestaurantMenu(supabase, targetRestaurantId),
  ]);
  const diff = buildTemplateOverrideDiff(templatePayload, targetMenu);
  const additions = buildTemplateAdditionsPayload(templatePayload, targetMenu);
  const additionCounts = countMenuPayload(additions);
  if (additionCounts.categories === 0 && additionCounts.items === 0) {
    return { ...additionCounts, diff };
  }

  const { data, error } = await supabase.rpc("merge_menu", {
    p_restaurant_id: targetRestaurantId,
    p_menu: additions,
  });
  if (error) {
    throw new Error(`Apply menu additions failed: ${error.message}`);
  }

  const stats =
    data && typeof data === "object"
      ? (data as Partial<CopyMenuResult>)
      : {};
  return {
    categories: Number(stats.categories ?? additionCounts.categories),
    items: Number(stats.items ?? additionCounts.items),
    modifiers: Number(stats.modifiers ?? additionCounts.modifiers),
    diff,
  };
}

export async function applyOrganizationMenuTemplate(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    templateId: string;
    targetRestaurantId: string;
  }
): Promise<CopyMenuResult> {
  const organizationId = input.organizationId.trim();
  const templateId = input.templateId.trim();
  const targetRestaurantId = input.targetRestaurantId.trim();
  if (!organizationId || !templateId || !targetRestaurantId) {
    throw new Error("Template and target restaurant are required.");
  }

  const payload = await loadOrganizationMenuTemplatePayload(supabase, {
    organizationId,
    templateId,
  });

  const { error: clearError } = await supabase.rpc("clear_restaurant_menu", {
    p_restaurant_id: targetRestaurantId,
  });
  if (clearError) {
    throw new Error(`Clear target menu failed: ${clearError.message}`);
  }

  const { data, error } = await supabase.rpc("merge_menu", {
    p_restaurant_id: targetRestaurantId,
    p_menu: payload,
  });
  if (error) {
    throw new Error(`Apply menu template failed: ${error.message}`);
  }

  await recordRestaurantMenuTemplateInheritance(supabase, {
    targetRestaurantId,
    templateId,
  });

  const stats =
    data && typeof data === "object"
      ? (data as Partial<CopyMenuResult>)
      : {};
  return {
    categories: Number(stats.categories ?? 0),
    items: Number(stats.items ?? 0),
    modifiers: Number(stats.modifiers ?? 0),
  };
}

export async function applyOrganizationMenuTemplateToInheritedRestaurants(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    templateId: string;
    excludeRestaurantIds?: string[];
    includeLocalOverrides?: boolean;
    localOverrideStrategy?: LocalOverrideTemplateStrategy;
  }
): Promise<ApplyTemplateToInheritedRestaurantsResult> {
  const organizationId = input.organizationId.trim();
  const templateId = input.templateId.trim();
  if (!organizationId || !templateId) {
    throw new Error("Template and organization are required.");
  }

  const excluded = new Set(
    (input.excludeRestaurantIds ?? [])
      .map((id) => id.trim())
      .filter(Boolean)
  );

  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, inherited_menu_template_override_count")
    .eq("organization_id", organizationId)
    .eq("inherited_menu_template_id", templateId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Load inherited locations failed: ${error.message}`);
  }

  const inheritedRestaurants = (
    (data ?? []) as Array<{
      id: string;
      name?: string | null;
      inherited_menu_template_override_count?: number | null;
    }>
  )
    .map((row) => ({
      id: String(row.id),
      name: row.name == null ? null : String(row.name),
      overrideCount: Number(row.inherited_menu_template_override_count ?? 0),
    }))
    .filter((row) => row.id);

  const skipped: SkippedInheritedRestaurant[] = [];
  const localOverrideStrategy: LocalOverrideTemplateStrategy =
    input.localOverrideStrategy ??
    (input.includeLocalOverrides === true ? "replace" : "skip");
  const targets = inheritedRestaurants.filter((row) => {
    if (excluded.has(row.id)) {
      skipped.push({
        restaurantId: row.id,
        restaurantName: row.name,
        reason: "excluded",
        overrideCount: row.overrideCount,
      });
      return false;
    }
    if (localOverrideStrategy === "skip" && row.overrideCount > 0) {
      skipped.push({
        restaurantId: row.id,
        restaurantName: row.name,
        reason: "local_override",
        overrideCount: row.overrideCount,
      });
      return false;
    }
    return true;
  });
  const applied: ApplyTemplateToInheritedRestaurantResult[] = [];
  const failed: ApplyTemplateToInheritedRestaurantsResult["failed"] = [];

  for (const target of targets) {
    try {
      const useAddMissing =
        target.overrideCount > 0 && localOverrideStrategy === "add_missing";
      const result = useAddMissing
        ? await applyOrganizationMenuTemplateAdditions(supabase, {
            organizationId,
            templateId,
            targetRestaurantId: target.id,
          })
        : await applyOrganizationMenuTemplate(supabase, {
            organizationId,
            templateId,
            targetRestaurantId: target.id,
          });
      applied.push({
        restaurantId: target.id,
        restaurantName: target.name,
        stats: result,
        mode: useAddMissing ? "add_missing" : "replace",
        diff: useAddMissing
          ? (result as CopyMenuResult & { diff: TemplateOverrideDiff }).diff
          : undefined,
      });
    } catch (e) {
      failed.push({
        restaurantId: target.id,
        restaurantName: target.name,
        error: e instanceof Error ? e.message : "Template apply failed.",
      });
    }
  }

  return {
    templateId,
    targetRestaurantIds: targets.map((target) => target.id),
    applied,
    skipped,
    failed,
  };
}

export type ApplyDefaultMenuTemplateResult =
  | {
      applied: true;
      templateId: string;
      templateName: string;
      stats: CopyMenuResult;
    }
  | {
      applied: false;
      reason: "no_default_template" | "not_configured" | "apply_failed";
      error?: string;
    };

export async function applyDefaultOrganizationMenuTemplate(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    targetRestaurantId: string;
  }
): Promise<ApplyDefaultMenuTemplateResult> {
  const organizationId = input.organizationId.trim();
  const targetRestaurantId = input.targetRestaurantId.trim();
  if (!organizationId || !targetRestaurantId) {
    return { applied: false, reason: "no_default_template" };
  }

  try {
    const { data: template, error } = await supabase
      .from("organization_menu_templates")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("is_default", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        applied: false,
        reason: "not_configured",
        error: error.message,
      };
    }
    if (!template?.id) {
      return { applied: false, reason: "no_default_template" };
    }

    const stats = await applyOrganizationMenuTemplate(supabase, {
      organizationId,
      templateId: String(template.id),
      targetRestaurantId,
    });

    return {
      applied: true,
      templateId: String(template.id),
      templateName: String(template.name ?? "Default menu"),
      stats,
    };
  } catch (e) {
    return {
      applied: false,
      reason: "apply_failed",
      error: e instanceof Error ? e.message : "Default menu template failed.",
    };
  }
}

async function recordRestaurantMenuTemplateInheritance(
  supabase: SupabaseClient,
  input: {
    targetRestaurantId: string;
    templateId: string;
  }
) {
  const { error } = await supabase
    .from("restaurants")
    .update({
      inherited_menu_template_id: input.templateId,
      inherited_menu_template_applied_at: new Date().toISOString(),
      inherited_menu_template_override_count: 0,
      inherited_menu_template_last_local_edit_at: null,
    })
    .eq("id", input.targetRestaurantId);

  if (error) {
    if (isMissingTemplateInheritanceColumn(error.message)) return;
    throw new Error(`Record menu template inheritance failed: ${error.message}`);
  }
}

async function clearRestaurantMenuTemplateInheritance(
  supabase: SupabaseClient,
  targetRestaurantId: string
) {
  const { error } = await supabase
    .from("restaurants")
    .update({
      inherited_menu_template_id: null,
      inherited_menu_template_applied_at: null,
      inherited_menu_template_override_count: 0,
      inherited_menu_template_last_local_edit_at: null,
    })
    .eq("id", targetRestaurantId);

  if (error) {
    if (isMissingTemplateInheritanceColumn(error.message)) return;
    throw new Error(`Clear menu template inheritance failed: ${error.message}`);
  }
}

export async function markRestaurantMenuTemplateLocalOverride(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<MarkMenuTemplateOverrideResult> {
  const targetRestaurantId = restaurantId.trim();
  if (!targetRestaurantId) return { marked: false, reason: "not_found" };

  const { data, error } = await supabase
    .from("restaurants")
    .select("inherited_menu_template_id, inherited_menu_template_override_count")
    .eq("id", targetRestaurantId)
    .maybeSingle();

  if (error) {
    if (isMissingTemplateInheritanceColumn(error.message)) {
      return { marked: false, reason: "not_configured" };
    }
    throw new Error(`Load menu template inheritance failed: ${error.message}`);
  }
  if (!data) return { marked: false, reason: "not_found" };

  const templateId =
    typeof data.inherited_menu_template_id === "string"
      ? data.inherited_menu_template_id
      : "";
  if (!templateId) return { marked: false, reason: "not_inherited" };

  const overrideCount =
    Number(data.inherited_menu_template_override_count ?? 0) + 1;
  const { error: updateError } = await supabase
    .from("restaurants")
    .update({
      inherited_menu_template_override_count: overrideCount,
      inherited_menu_template_last_local_edit_at: new Date().toISOString(),
    })
    .eq("id", targetRestaurantId);

  if (updateError) {
    if (isMissingTemplateInheritanceColumn(updateError.message)) {
      return { marked: false, reason: "not_configured" };
    }
    throw new Error(`Mark menu template override failed: ${updateError.message}`);
  }

  return { marked: true, templateId, overrideCount };
}

function isMissingTemplateInheritanceColumn(message: string | undefined) {
  return /inherited_menu_template|schema cache|column/i.test(message ?? "");
}

export type TemplateFieldUpdateSelection = {
  categoryName: string;
  itemName: string;
  fields: TemplateItemFieldOverride["fields"];
};

export type ApplyTemplateFieldUpdatesResult = {
  updatedItems: number;
  updatedFields: number;
};

export async function applyOrganizationMenuTemplateFieldUpdates(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    templateId: string;
    targetRestaurantId: string;
    selections: TemplateFieldUpdateSelection[];
  }
): Promise<ApplyTemplateFieldUpdatesResult> {
  const organizationId = input.organizationId.trim();
  const templateId = input.templateId.trim();
  const targetRestaurantId = input.targetRestaurantId.trim();
  if (!organizationId || !templateId || !targetRestaurantId) {
    throw new Error("Template and target restaurant are required.");
  }

  const allowedFields = new Set([
    "description",
    "price",
    "availability",
    "modifiers",
  ] satisfies TemplateItemFieldOverride["fields"]);
  const selections = input.selections
    .map((selection) => ({
      categoryName: selection.categoryName.trim(),
      itemName: selection.itemName.trim(),
      fields: selection.fields.filter((field) => allowedFields.has(field)),
    }))
    .filter(
      (selection) =>
        selection.categoryName && selection.itemName && selection.fields.length > 0
    );

  if (selections.length === 0) {
    return { updatedItems: 0, updatedFields: 0 };
  }

  const [templatePayload, targetMenu] = await Promise.all([
    loadOrganizationMenuTemplatePayload(supabase, { organizationId, templateId }),
    loadRestaurantMenu(supabase, targetRestaurantId),
  ]);

  const templateCategories = new Map(
    templatePayload.categories.map((category) => [
      normalizedMenuName(category.name),
      category,
    ])
  );
  const targetCategories = new Map(
    targetMenu.categories.map((category) => [
      normalizedMenuName(category.name),
      category,
    ])
  );
  const targetItemsByCategory = new Map<string, Map<string, DbItem>>();
  for (const category of targetMenu.categories) {
    targetItemsByCategory.set(normalizedMenuName(category.name), new Map());
  }
  for (const item of targetMenu.items) {
    const category = targetMenu.categories.find(
      (candidate) => candidate.id === item.category_id
    );
    if (!category) continue;
    targetItemsByCategory
      .get(normalizedMenuName(category.name))
      ?.set(normalizedMenuName(item.name), item);
  }

  let updatedItems = 0;
  let updatedFields = 0;
  const now = new Date().toISOString();

  for (const selection of selections) {
    const categoryKey = normalizedMenuName(selection.categoryName);
    const itemKey = normalizedMenuName(selection.itemName);
    const templateCategory = templateCategories.get(categoryKey);
    const targetCategory = targetCategories.get(categoryKey);
    if (!templateCategory || !targetCategory) continue;
    const templateItem = templateCategory.items.find(
      (item) => normalizedMenuName(item.name) === itemKey
    );
    const targetItem = targetItemsByCategory.get(categoryKey)?.get(itemKey);
    if (!templateItem || !targetItem) continue;

    const itemUpdate: Partial<Pick<DbItem, "description" | "price" | "is_available" | "updated_at">> = {};
    if (selection.fields.includes("description")) {
      itemUpdate.description = templateItem.description ?? null;
    }
    if (selection.fields.includes("price")) {
      itemUpdate.price = templateItem.price ?? null;
    }
    if (selection.fields.includes("availability")) {
      itemUpdate.is_available = templateItem.base_availability ?? true;
    }

    const itemFieldCount = Object.keys(itemUpdate).length;
    if (itemFieldCount > 0) {
      itemUpdate.updated_at = now;
      const { error } = await supabase
        .from("items")
        .update(itemUpdate)
        .eq("id", targetItem.id);
      if (error) {
        throw new Error(`Apply inherited item fields failed: ${error.message}`);
      }
    }

    if (selection.fields.includes("modifiers")) {
      const { error: deleteError } = await supabase
        .from("modifiers")
        .delete()
        .eq("item_id", targetItem.id);
      if (deleteError) {
        throw new Error(`Clear inherited modifiers failed: ${deleteError.message}`);
      }

      if (templateItem.modifiers.length > 0) {
        const groupOrder = new Map<string, number>();
        const groupItemCounts = new Map<string, number>();
        const rows = templateItem.modifiers.map((modifier) => {
          const groupKey = normalizedMenuName(modifier.group_name);
          if (!groupOrder.has(groupKey)) {
            groupOrder.set(groupKey, groupOrder.size + 1);
          }
          const nextSort = (groupItemCounts.get(groupKey) ?? 0) + 1;
          groupItemCounts.set(groupKey, nextSort);
          return {
            item_id: targetItem.id,
            group_name: modifier.group_name,
            modifier_name: modifier.modifier_name,
            extra_price: modifier.extra_price,
            min_selection: modifier.min_selection,
            max_selection: modifier.max_selection,
            sort_order: nextSort,
            group_sort_order: groupOrder.get(groupKey) ?? 1,
          };
        });
        const { error: insertError } = await supabase
          .from("modifiers")
          .insert(rows);
        if (insertError) {
          throw new Error(`Apply inherited modifiers failed: ${insertError.message}`);
        }
      }
    }

    updatedItems += 1;
    updatedFields += itemFieldCount + (selection.fields.includes("modifiers") ? 1 : 0);
  }

  return { updatedItems, updatedFields };
}
