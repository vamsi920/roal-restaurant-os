export type MenuImportStatus =
  | "pending"
  | "uploaded"
  | "extracted"
  | "extraction_failed"
  | "committed"
  | "commit_failed"
  | "discarded";

export type MenuImportRow = {
  id: string;
  restaurant_id: string;
  organization_id: string;
  uploaded_by: string | null;
  storage_bucket: string;
  storage_path: string;
  original_filename: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  model_used: string | null;
  extraction_status: MenuImportStatus;
  extraction_error: string | null;
  extracted_menu: unknown;
  review_hints: unknown;
  extraction_summary: unknown;
  merge_result: unknown;
  committed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MenuImportListItem = MenuImportRow & {
  uploader_name: string | null;
  signed_image_url: string | null;
};

export type MergeResultSummary = {
  categories: number;
  items: number;
  modifiers: number;
};
