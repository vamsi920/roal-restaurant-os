import { NextResponse } from "next/server";
import { scanMenuImage } from "@/lib/gemini";
import { getServerSupabase } from "@/lib/supabase/server";
import { MenuSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const restaurantId = form.get("restaurant_id");
    const image = form.get("image");

    if (typeof restaurantId !== "string" || !restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 }
      );
    }
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "image file is required" }, { status: 400 });
    }
    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "uploaded file is not an image" },
        { status: 400 }
      );
    }
    if (image.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "image must be 8 MB or smaller" },
        { status: 413 }
      );
    }

    const arrayBuffer = await image.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    let rawJson: unknown;
    try {
      rawJson = await scanMenuImage(base64, image.type);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gemini call failed";
      return NextResponse.json(
        { error: `Vision extraction failed: ${message}` },
        { status: 502 }
      );
    }

    const parsed = MenuSchema.safeParse(rawJson);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Gemini returned invalid menu structure",
          details: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }

    const menuWithSortOrder = {
      categories: parsed.data.categories.map((c, idx) => ({
        ...c,
        sort_order: c.sort_order ?? idx + 1,
      })),
    };

    const supabase = getServerSupabase();
    const { data, error } = await supabase.rpc("merge_menu", {
      p_restaurant_id: restaurantId,
      p_menu: menuWithSortOrder,
    });

    if (error) {
      return NextResponse.json(
        { error: `Merge failed: ${error.message}` },
        { status: 500 }
      );
    }

    const stats = (data as { categories: number; items: number; modifiers: number }) ?? {
      categories: 0,
      items: 0,
      modifiers: 0,
    };

    return NextResponse.json({ ok: true, stats, menu: menuWithSortOrder });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
