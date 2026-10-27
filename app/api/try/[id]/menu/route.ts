import { NextResponse } from "next/server";
import { requireTrialFromCookie } from "@/lib/trial/auth";
import { deepSearchTrialMenu, resolveTrialMenu } from "@/lib/trial/pipeline";
import { toPublicView } from "@/lib/trial/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireTrialFromCookie(params.id);
  if (!auth.ok) return auth.response;

  let menuUrl: string | null = null;
  let deep = false;
  let image: { base64: string; mimeType: string } | null = null;

  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("image");
      const url = form.get("menu_url");
      if (typeof url === "string" && url.trim()) menuUrl = url.trim().slice(0, 500);
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_IMAGE_BYTES) {
          return NextResponse.json({ error: "Image is too large (8 MB max)." }, { status: 413 });
        }
        if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)) {
          return NextResponse.json({ error: "Upload a JPG, PNG, or WEBP photo." }, { status: 415 });
        }
        const bytes = Buffer.from(await file.arrayBuffer());
        image = { base64: bytes.toString("base64"), mimeType: file.type };
      }
    } else {
      const body = (await req.json().catch(() => ({}))) as { menu_url?: unknown; deep?: unknown };
      if (typeof body.menu_url === "string" && body.menu_url.trim()) {
        menuUrl = body.menu_url.trim().slice(0, 500);
      }
      deep = body.deep === true;
    }
    // `deep`: the site had no priced menu; search the web, PDFs and photos (one request, own budget).
    const trial =
      deep && !menuUrl && !image
        ? await deepSearchTrialMenu(auth.trial.id)
        : await resolveTrialMenu(auth.trial.id, { menuUrl, image });
    return NextResponse.json({ trial: toPublicView(trial) });
  } catch (e) {
    console.error("[try menu]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not read the menu. Try again." }, { status: 500 });
  }
}
