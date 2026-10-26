import { NextResponse } from "next/server";
import { elevenlabsFetch } from "@/lib/elevenlabs";
import { TRIAL_VOICE_OPTIONS } from "@/lib/trial/voices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VoiceRow = { voice_id?: string; preview_url?: string };

let cache: { at: number; voices: Array<{ id: string; previewUrl: string | null }> } | null = null;
const TTL_MS = 6 * 60 * 60 * 1000;

/** Curated voices with ElevenLabs preview clips so owners can hear before choosing. */
export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json({ voices: merge(cache.voices) });
  }
  let previews = new Map<string, string | null>();
  try {
    const res = await elevenlabsFetch("/v1/voices", { method: "GET" });
    if (res.ok) {
      const data = (await res.json()) as { voices?: VoiceRow[] };
      previews = new Map(
        (data.voices ?? [])
          .filter((v) => typeof v.voice_id === "string")
          .map((v) => [v.voice_id as string, typeof v.preview_url === "string" ? v.preview_url : null])
      );
    }
  } catch {
    // Previews are optional.
  }
  const voices = TRIAL_VOICE_OPTIONS.map((v) => ({ id: v.id, previewUrl: previews.get(v.id) ?? null }));
  cache = { at: Date.now(), voices };
  return NextResponse.json({ voices: merge(voices) });
}

function merge(previews: Array<{ id: string; previewUrl: string | null }>) {
  const byId = new Map(previews.map((p) => [p.id, p.previewUrl]));
  return TRIAL_VOICE_OPTIONS.map((v) => ({ ...v, previewUrl: byId.get(v.id) ?? null }));
}
