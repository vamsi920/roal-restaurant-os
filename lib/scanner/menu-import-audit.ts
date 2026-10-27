import type { Db } from "@/lib/db";
import type { ReviewHint } from "@/lib/menu-import/types";
import type { ScannedMenu } from "@/lib/menu-import/types";
import type {
  MenuImportListItem,
  MenuImportRow,
  MenuImportStatus,
  MergeResultSummary,
} from "@/lib/menu-import/audit-types";

export const MENU_UPLOADS_BUCKET = "menu-uploads";

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  return base.length > 0 ? base : "menu-upload.jpg";
}

export function buildStoragePath(
  restaurantId: string,
  importId: string,
  filename: string
): string {
  return `${restaurantId}/${importId}/${sanitizeFilename(filename)}`;
}

export async function createMenuImportRecord(
  supabase: Db,
  input: {
    restaurantId: string;
    organizationId: string;
    uploadedBy: string | null;
    originalFilename: string;
    fileSizeBytes: number;
    mimeType: string;
  }
): Promise<MenuImportRow> {
  const importId = crypto.randomUUID();
  const storagePath = buildStoragePath(
    input.restaurantId,
    importId,
    input.originalFilename
  );

  const { data, error } = await supabase
    .from("menu_imports")
    .insert({
      id: importId,
      restaurant_id: input.restaurantId,
      organization_id: input.organizationId,
      uploaded_by: input.uploadedBy,
      storage_bucket: MENU_UPLOADS_BUCKET,
      storage_path: storagePath,
      original_filename: input.originalFilename,
      file_size_bytes: input.fileSizeBytes,
      mime_type: input.mimeType,
      extraction_status: "pending",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as MenuImportRow;
}

export async function uploadMenuImportFile(
  supabase: Db,
  storagePath: string,
  fileBytes: ArrayBuffer,
  mimeType: string
): Promise<void> {
  // File storage is not enabled on the Firebase free plan; the extracted menu is kept
  // on the import row, the original photo is not retained.
  void supabase;
  void storagePath;
  void fileBytes;
  void mimeType;
}

export async function patchMenuImportStatus(
  supabase: Db,
  importId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("menu_imports")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", importId);

  if (error) throw new Error(error.message);
}

export async function recordMenuImportExtracted(
  supabase: Db,
  importId: string,
  input: {
    modelUsed: string;
    menu: ScannedMenu;
    hints: ReviewHint[];
    summary: Record<string, number>;
  }
): Promise<void> {
  await patchMenuImportStatus(supabase, importId, {
    extraction_status: "extracted",
    model_used: input.modelUsed,
    extracted_menu: input.menu,
    review_hints: input.hints,
    extraction_summary: input.summary,
    extraction_error: null,
  });
}

export async function recordMenuImportExtractionFailed(
  supabase: Db,
  importId: string,
  message: string
): Promise<void> {
  await patchMenuImportStatus(supabase, importId, {
    extraction_status: "extraction_failed",
    extraction_error: message,
  });
}

export async function recordMenuImportCommitted(
  supabase: Db,
  importId: string,
  mergeResult: MergeResultSummary
): Promise<void> {
  await patchMenuImportStatus(supabase, importId, {
    extraction_status: "committed",
    merge_result: mergeResult,
    committed_at: new Date().toISOString(),
    extraction_error: null,
  });
}

export async function recordMenuImportCommitFailed(
  supabase: Db,
  importId: string,
  message: string
): Promise<void> {
  await patchMenuImportStatus(supabase, importId, {
    extraction_status: "commit_failed",
    extraction_error: message,
  });
}

export async function recordMenuImportDiscarded(
  supabase: Db,
  importId: string
): Promise<void> {
  await patchMenuImportStatus(supabase, importId, {
    extraction_status: "discarded",
  });
}

export async function getMenuImportForRestaurant(
  supabase: Db,
  restaurantId: string,
  importId: string
): Promise<MenuImportRow | null> {
  const { data, error } = await supabase
    .from("menu_imports")
    .select("*")
    .eq("id", importId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as MenuImportRow | null;
}

export async function listRecentMenuImports(
  supabase: Db,
  restaurantId: string,
  limit = 20
): Promise<MenuImportListItem[]> {
  const { data, error } = await supabase
    .from("menu_imports")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MenuImportRow[];
  const uploaderIds = [
    ...new Set(rows.map((r) => r.uploaded_by).filter(Boolean)),
  ] as string[];

  const profileMap = new Map<string, string>();
  if (uploaderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", uploaderIds);

    for (const p of profiles ?? []) {
      profileMap.set(
        String(p.id),
        p.display_name != null ? String(p.display_name) : "User"
      );
    }
  }

  const enriched: MenuImportListItem[] = [];
  for (const row of rows) {
    const signedUrl: string | null = null;
    // Original photos are not retained (see uploadMenuImportFile).

    enriched.push({
      ...row,
      extraction_status: row.extraction_status as MenuImportStatus,
      uploader_name: row.uploaded_by
        ? profileMap.get(row.uploaded_by) ?? null
        : null,
      signed_image_url: signedUrl,
    });
  }

  return enriched;
}
