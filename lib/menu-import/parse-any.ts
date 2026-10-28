import { strFromU8, unzipSync } from "fflate";
import { extractMenuFromDocument, extractMenuFromWebsiteText } from "@/lib/ai";
import { ScannedMenuSchema, type ScannedMenu } from "@/lib/menu-import/types";

/**
 * Turn whatever the owner uploads (menu photos, PDF, Word, Excel, CSV, plain text or pasted
 * text) into a ScannedMenu. Photos and PDFs go to the model as documents; everything else is
 * converted to text first and read like a website menu.
 */

export type MenuFileKind = "image" | "pdf" | "docx" | "xlsx" | "text";

export class MenuFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MenuFileError";
  }
}

const IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/i;

export function detectMenuFileKind(name: string, mime: string): MenuFileKind | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const type = mime.toLowerCase();
  if (IMAGE_MIME.test(type) || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  if (type === "application/pdf" || ext === "pdf") return "pdf";
  if (ext === "docx" || type.includes("wordprocessingml")) return "docx";
  if (ext === "xlsx" || type.includes("spreadsheetml")) return "xlsx";
  if (["csv", "tsv", "txt", "md"].includes(ext) || type.startsWith("text/")) return "text";
  return null;
}

export function unsupportedFileMessage(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "heic" || ext === "heif") return "iPhone HEIC photos aren't supported yet. Export it as JPG, or take a screenshot of it.";
  if (ext === "doc") return "Old .doc files aren't supported. Save it as .docx or PDF and upload again.";
  if (ext === "xls" || ext === "numbers") return "Save the spreadsheet as .xlsx or .csv and upload again.";
  if (ext === "pages") return "Export it from Pages as PDF and upload again.";
  return "That file type isn't supported. Upload a photo, PDF, Word, Excel, CSV or text file.";
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

function unzip(bytes: Uint8Array): Record<string, Uint8Array> {
  try {
    return unzipSync(bytes);
  } catch {
    throw new MenuFileError("That file looks damaged. Re-save it and upload again.");
  }
}

/** Word: paragraphs and table cells from word/document.xml, one paragraph per line. */
export function docxToText(bytes: Uint8Array): string {
  const xml = unzip(bytes)["word/document.xml"];
  if (!xml) throw new MenuFileError("That Word file has no readable text.");
  return decodeXml(
    strFromU8(xml)
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<\/w:tc>/g, "\t")
      .replace(/<w:br\/>|<\/w:p>|<\/w:tr>/g, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Excel: every sheet as tab-separated rows (shared strings and inline strings resolved). */
export function xlsxToText(bytes: Uint8Array): string {
  const files = unzip(bytes);
  const shared: string[] = [];
  const sst = files["xl/sharedStrings.xml"];
  if (sst) {
    for (const si of strFromU8(sst).matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push(decodeXml([...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
    }
  }
  const sheets = Object.keys(files)
    .filter((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  const lines: string[] = [];
  for (const sheet of sheets) {
    for (const row of strFromU8(files[sheet]).matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = [];
      for (const c of row[1].matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1];
        const inner = c[2] ?? "";
        const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (/t="s"/.test(attrs) && v != null) cells.push(shared[Number(v)] ?? "");
        else if (/t="inlineStr"/.test(attrs)) cells.push(decodeXml(inner.replace(/<[^>]+>/g, "")));
        else if (v != null) cells.push(decodeXml(v));
      }
      if (cells.some((c) => c.trim())) lines.push(cells.join("\t"));
    }
    lines.push("");
  }
  const text = lines.join("\n").trim();
  if (!text) throw new MenuFileError("That spreadsheet is empty.");
  return text;
}

export async function parseMenuFile(input: { bytes: Uint8Array; name: string; mime: string }): Promise<ScannedMenu> {
  const kind = detectMenuFileKind(input.name, input.mime);
  if (!kind) throw new MenuFileError(unsupportedFileMessage(input.name));

  let scan: { data: unknown };
  if (kind === "image" || kind === "pdf") {
    const mime = kind === "pdf" ? "application/pdf" : IMAGE_MIME.test(input.mime) ? input.mime.toLowerCase() : "image/jpeg";
    scan = await extractMenuFromDocument(Buffer.from(input.bytes).toString("base64"), mime, { careful: true });
  } else {
    const text =
      kind === "docx" ? docxToText(input.bytes) : kind === "xlsx" ? xlsxToText(input.bytes) : new TextDecoder().decode(input.bytes);
    scan = await parseMenuTextRaw(text);
  }
  return validated(scan.data);
}

/** Menu typed or pasted by the owner. */
export async function parseMenuText(text: string): Promise<ScannedMenu> {
  return validated((await parseMenuTextRaw(text)).data);
}

async function parseMenuTextRaw(text: string) {
  if (text.trim().length < 10) throw new MenuFileError("There's no menu text in that file.");
  return extractMenuFromWebsiteText(text);
}

function validated(data: unknown): ScannedMenu {
  const parsed = ScannedMenuSchema.safeParse(data);
  if (!parsed.success || parsed.data.categories.every((c) => c.items.length === 0)) {
    throw new MenuFileError("We couldn't find menu items in that file. Try a clearer photo or another format.");
  }
  return parsed.data;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Combine menus from several uploads: same-named categories merge, repeated items are dropped. */
export function mergeMenus(base: ScannedMenu | null, add: ScannedMenu): ScannedMenu {
  const categories = (base?.categories ?? []).map((c) => ({ ...c, items: [...c.items] }));
  for (const cat of add.categories) {
    const existing = categories.find((c) => norm(c.name) === norm(cat.name));
    if (!existing) {
      categories.push({ ...cat, items: [...cat.items], sort_order: categories.length + 1 });
      continue;
    }
    for (const item of cat.items) {
      if (!existing.items.some((i) => norm(i.name) === norm(item.name))) existing.items.push(item);
    }
  }
  return { ...(base ?? add), categories } as ScannedMenu;
}

export function countMenuItems(menu: ScannedMenu): number {
  return menu.categories.reduce((n, c) => n + c.items.length, 0);
}
