import { NextResponse } from "next/server";
import { EnvValidationError } from "@/lib/env.shared";
import {
  countMenuItems,
  MenuFileError,
  mergeMenus,
  parseMenuFile,
  parseMenuText,
} from "@/lib/menu-import/parse-any";
import { clientIpFromRequest, SlidingWindowRateLimiter } from "@/lib/restaurant-lookup/rate-limit";
import { requireTrialFromCookie } from "@/lib/trial/auth";
import { getTrial, toPublicView, updateTrial, upsertStep } from "@/lib/trial/store";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Netlify rejects request bodies over ~6 MB; the browser shrinks photos before sending. */
const MAX_FILE_BYTES = 5.5 * 1024 * 1024;
const MAX_TEXT_CHARS = 60_000;

const uploadLimiter = new SlidingWindowRateLimiter(40, 10 * 60 * 1000);

/**
 * One menu file (photo, PDF, Word, Excel, CSV, text) or pasted text per request.
 * `mode=replace` starts a fresh uploaded menu; `mode=append` adds to the one being built,
 * so several photos of a multi-page menu end up as one menu.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!uploadLimiter.check(clientIpFromRequest(req)).allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again in a few minutes." }, { status: 429 });
  }
  const auth = await requireTrialFromCookie(params.id);
  if (!auth.ok) return auth.response;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Upload a file or paste your menu." }, { status: 400 });
  const file = form.get("file");
  const text = form.get("text");
  const append = form.get("mode") === "append";

  try {
    let parsed;
    let label: string;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `${file.name} is too large (5 MB max). Split the PDF or upload photos of each page.` },
          { status: 413 }
        );
      }
      parsed = await parseMenuFile({ bytes: new Uint8Array(await file.arrayBuffer()), name: file.name, mime: file.type });
      label = file.name;
    } else if (typeof text === "string" && text.trim()) {
      parsed = await parseMenuText(text.slice(0, MAX_TEXT_CHARS));
      label = "your pasted menu";
    } else {
      return NextResponse.json({ error: "Upload a file or paste your menu." }, { status: 400 });
    }

    // Re-read so sequential uploads always merge onto the latest saved menu.
    const current = (await getTrial(auth.trial.id)) ?? auth.trial;
    const base = append && current.menu_source === "upload" ? current.menu : null;
    const menu = mergeMenus(base, parsed);
    const total = countMenuItems(menu);
    const trial = await updateTrial(current.id, {
      menu,
      menu_source: "upload",
      menu_source_url: null,
      step_log: upsertStep(current.step_log, {
        id: "menu",
        status: "done",
        title: "Menu loaded",
        detail: `Read ${total} items from your upload`,
      }),
    });
    return NextResponse.json({ trial: toPublicView(trial), added: countMenuItems(parsed), file: label });
  } catch (e) {
    if (e instanceof MenuFileError) return NextResponse.json({ error: e.message }, { status: 422 });
    if (e instanceof EnvValidationError) {
      return NextResponse.json({ error: "Menu reading isn't configured on this server yet." }, { status: 503 });
    }
    console.error("[try menu upload]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "We couldn't read that file. Try again or use another format." }, { status: 500 });
  }
}
