import { NextResponse } from "next/server";
import { EnvValidationError } from "@/lib/env.shared";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { extractMenuFromImage } from "@/lib/scanner/extract-menu";

export const runtime = "nodejs";
export const maxDuration = 60;

/** @deprecated Prefer /api/scanner/extract — no longer merges automatically. */
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

    const access = await requireRestaurantAccess(restaurantId);
    if (access.errorResponse) return access.errorResponse;

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "image file is required" }, { status: 400 });
    }

    const { menu, hints } = await extractMenuFromImage(image);

    return NextResponse.json({
      ok: true,
      restaurant_id: restaurantId,
      menu,
      hints,
      deprecated:
        "This endpoint no longer merges to the database. Use /api/scanner/extract then /api/scanner/commit after review.",
    });
  } catch (err) {
    if (err instanceof EnvValidationError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
