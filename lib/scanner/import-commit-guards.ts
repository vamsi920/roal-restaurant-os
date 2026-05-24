import type { MenuImportStatus } from "@/lib/menu-import/audit-types";

const COMMITTABLE: MenuImportStatus[] = ["extracted", "commit_failed"];

export function commitBlockedReason(
  status: MenuImportStatus
): string | null {
  if (COMMITTABLE.includes(status)) return null;

  switch (status) {
    case "committed":
      return "This import was already committed.";
    case "discarded":
      return "This import was discarded.";
    case "extraction_failed":
      return "Extraction failed — scan the menu again.";
    case "pending":
    case "uploaded":
      return "Import is still processing.";
    default:
      return "Import is not ready to commit.";
  }
}
