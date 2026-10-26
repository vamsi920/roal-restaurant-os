import { NextResponse } from "next/server";
import { requireTrialFromCookie } from "@/lib/trial/auth";
import { recomposeTrialAgent } from "@/lib/trial/pipeline";
import { toPublicView, updateTrial } from "@/lib/trial/store";
import type { TrialKnowledgeEntry } from "@/lib/trial/types";
import { findTrialVoice } from "@/lib/trial/voices";

export const runtime = "nodejs";

const CATEGORIES = new Set(["general", "hours", "menu", "allergens", "directions", "policies", "handoff"]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireTrialFromCookie(params.id);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as {
    agentName?: unknown;
    voiceId?: unknown;
    knowledge?: unknown;
    restaurantName?: unknown;
  };

  const persona = { ...auth.trial.persona };
  if (typeof body.agentName === "string") {
    const name = body.agentName.trim().slice(0, 40);
    if (name) persona.agentName = name;
  }
  if (typeof body.voiceId === "string") {
    const voice = findTrialVoice(body.voiceId);
    if (!voice) return NextResponse.json({ error: "Unknown voice." }, { status: 400 });
    persona.voiceId = voice.id;
    persona.voiceLabel = voice.label;
  }

  const patch: Record<string, unknown> = { persona };

  if (typeof body.restaurantName === "string" && body.restaurantName.trim()) {
    patch.restaurant_name = body.restaurantName.trim().slice(0, 120);
  }

  if (Array.isArray(body.knowledge)) {
    const entries: TrialKnowledgeEntry[] = [];
    for (const raw of body.knowledge.slice(0, 12)) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      const question = typeof r.question === "string" ? r.question.trim().slice(0, 220) : "";
      const answer = typeof r.answer === "string" ? r.answer.trim().slice(0, 1200) : "";
      const category = typeof r.category === "string" && CATEGORIES.has(r.category) ? r.category : "general";
      if (question.length < 2 || answer.length < 2) continue;
      entries.push({ category: category as TrialKnowledgeEntry["category"], question, answer });
    }
    patch.knowledge = entries;
  }

  try {
    await updateTrial(auth.trial.id, patch);
    const trial =
      auth.trial.status === "ready" ? await recomposeTrialAgent(auth.trial.id) : await updateTrial(auth.trial.id, {});
    return NextResponse.json({ trial: toPublicView(trial) });
  } catch (e) {
    console.error("[try persona]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }
}
