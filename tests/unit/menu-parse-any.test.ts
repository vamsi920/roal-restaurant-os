import { strToU8, zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai", () => ({ extractMenuFromDocument: vi.fn(), extractMenuFromWebsiteText: vi.fn() }));

import {
  detectMenuFileKind,
  docxToText,
  mergeMenus,
  unsupportedFileMessage,
  xlsxToText,
} from "@/lib/menu-import/parse-any";
import type { ScannedMenu } from "@/lib/menu-import/types";

describe("detectMenuFileKind", () => {
  it("recognizes every format owners send", () => {
    expect(detectMenuFileKind("page1.JPG", "")).toBe("image");
    expect(detectMenuFileKind("menu", "image/png")).toBe("image");
    expect(detectMenuFileKind("menu.pdf", "application/octet-stream")).toBe("pdf");
    expect(detectMenuFileKind("menu.docx", "")).toBe("docx");
    expect(detectMenuFileKind("prices.xlsx", "")).toBe("xlsx");
    expect(detectMenuFileKind("menu.csv", "text/csv")).toBe("text");
    expect(detectMenuFileKind("menu.txt", "")).toBe("text");
    expect(detectMenuFileKind("IMG_1234.HEIC", "image/heic")).toBeNull();
  });

  it("explains how to fix unsupported files", () => {
    expect(unsupportedFileMessage("IMG.heic")).toMatch(/JPG/);
    expect(unsupportedFileMessage("old.doc")).toMatch(/docx|PDF/);
    expect(unsupportedFileMessage("menu.numbers")).toMatch(/xlsx|csv/);
  });
});

describe("docxToText", () => {
  it("keeps paragraphs and table cells readable", () => {
    const xml =
      '<w:document><w:body><w:p><w:r><w:t>PIZZAS</w:t></w:r></w:p>' +
      "<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Margherita</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>$14.00</w:t></w:r></w:p></w:tc></w:tr></w:tbl>" +
      "<w:p><w:r><w:t>Tom &amp; Mozz</w:t></w:r><w:r><w:tab/><w:t>16.50</w:t></w:r></w:p></w:body></w:document>";
    const docx = zipSync({ "word/document.xml": strToU8(xml) });
    const text = docxToText(docx);
    expect(text).toContain("PIZZAS");
    expect(text).toMatch(/Margherita\s+\$14\.00/);
    expect(text).toMatch(/Tom & Mozz\t16\.50/);
  });
});

describe("xlsxToText", () => {
  it("turns rows into tab-separated lines with shared strings resolved", () => {
    const shared = '<sst><si><t>Item</t></si><si><t>Price</t></si><si><t>Garlic Knots</t></si></sst>';
    const sheet =
      '<worksheet><sheetData><row r="1"><c t="s"><v>0</v></c><c t="s"><v>1</v></c></row>' +
      '<row r="2"><c t="s"><v>2</v></c><c><v>6.5</v></c></row>' +
      '<row r="3"><c t="inlineStr"><is><t>Calzone</t></is></c><c><v>12</v></c></row></sheetData></worksheet>';
    const xlsx = zipSync({ "xl/sharedStrings.xml": strToU8(shared), "xl/worksheets/sheet1.xml": strToU8(sheet) });
    expect(xlsxToText(xlsx)).toBe("Item\tPrice\nGarlic Knots\t6.5\nCalzone\t12");
  });

  it("rejects files that aren't really zips", () => {
    expect(() => xlsxToText(strToU8("not a spreadsheet"))).toThrow(/damaged/);
  });
});

describe("mergeMenus", () => {
  const menu = (cats: Array<[string, string[]]>): ScannedMenu =>
    ({
      categories: cats.map(([name, items], i) => ({
        name,
        sort_order: i + 1,
        items: items.map((n) => ({ name: n, price: 5, base_availability: true, modifiers: [] })),
      })),
    }) as unknown as ScannedMenu;

  it("joins pages of one menu without duplicating items", () => {
    const page1 = menu([["Pizzas", ["Margherita", "Pepperoni"]]]);
    const page2 = menu([["PIZZAS", ["Pepperoni", "Veggie"]], ["Drinks", ["Coke"]]]);
    const merged = mergeMenus(page1, page2);
    expect(merged.categories.map((c) => [c.name, c.items.map((i) => i.name)])).toEqual([
      ["Pizzas", ["Margherita", "Pepperoni", "Veggie"]],
      ["Drinks", ["Coke"]],
    ]);
  });

  it("starts fresh when there is no base menu", () => {
    const only = menu([["Mains", ["Burger"]]]);
    expect(mergeMenus(null, only).categories).toHaveLength(1);
  });
});
