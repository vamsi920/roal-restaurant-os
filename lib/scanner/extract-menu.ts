import { scanMenuImage } from "@/lib/gemini";
import { buildReviewHints } from "@/lib/menu-import/review-hints";
import {
  ScannedMenuSchema,
  type ScannedMenu,
} from "@/lib/menu-import/types";

export const MENU_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i;

export type ExtractMenuResult = {
  menu: ScannedMenu;
  hints: ReturnType<typeof buildReviewHints>;
  modelUsed: string;
};

export function resolveMenuImageMimeType(image: File): string {
  const type = image.type.trim().toLowerCase();
  if (type.startsWith("image/")) return type;
  const name = image.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".heic") || name.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

export function validateMenuImageFile(image: File): void {
  const type = image.type.trim().toLowerCase();
  const hasImageType = type.startsWith("image/");
  const hasImageExt = IMAGE_EXT_RE.test(image.name);
  if (!hasImageType && !hasImageExt) {
    throw new Error("uploaded file is not an image");
  }
  if (image.size <= 0) {
    throw new Error("image file is empty");
  }
  if (image.size > MENU_IMAGE_MAX_BYTES) {
    throw new Error("image must be 8 MB or smaller");
  }
}

export function extractErrorHttpStatus(message: string): number {
  const m = message.toLowerCase();
  if (
    m.includes("not an image") ||
    m.includes("8 mb") ||
    m.includes("empty") ||
    m.includes("file is required")
  ) {
    return 400;
  }
  if (m.includes("invalid menu")) {
    return 422;
  }
  return 502;
}

export async function extractMenuFromImage(
  image: File
): Promise<ExtractMenuResult> {
  validateMenuImageFile(image);

  const arrayBuffer = await image.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = resolveMenuImageMimeType(image);

  const scan = await scanMenuImage(base64, mimeType);
  const parsed = ScannedMenuSchema.safeParse(scan.data);

  if (!parsed.success) {
    throw new Error(
      `Gemini returned invalid menu structure: ${parsed.error.issues[0]?.message ?? "validation failed"}`
    );
  }

  const menu: ScannedMenu = {
    categories: parsed.data.categories.map((c, idx) => ({
      ...c,
      sort_order: c.sort_order ?? idx + 1,
    })),
  };

  const hints = buildReviewHints(menu);
  return { menu, hints, modelUsed: scan.modelUsed };
}
