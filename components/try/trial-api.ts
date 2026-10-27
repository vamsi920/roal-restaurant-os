"use client";

import type { TrialPublicView } from "@/lib/trial/types";

export type TrialApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number; data?: T };

async function request<T>(url: string, init?: RequestInit): Promise<TrialApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers:
        init?.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json", ...(init?.headers ?? {}) }
          : init?.headers,
      credentials: "same-origin",
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error || "Something went wrong.", status: res.status, data };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again.", status: 0 };
  }
}

type TrialEnvelope = { trial: TrialPublicView };

export const trialApi = {
  start: (input: string) =>
    request<TrialEnvelope>("/api/try", { method: "POST", body: JSON.stringify({ input }) }),
  get: (id: string) => request<TrialEnvelope>(`/api/try/${id}`),
  listing: (id: string) => request<TrialEnvelope>(`/api/try/${id}/listing`, { method: "POST" }),
  menu: (id: string, body?: { menu_url?: string } | FormData) =>
    request<TrialEnvelope>(`/api/try/${id}/menu`, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  agent: (id: string) => request<TrialEnvelope>(`/api/try/${id}/agent`, { method: "POST" }),
  persona: (
    id: string,
    body: { agentName?: string; voiceId?: string; restaurantName?: string; knowledge?: unknown[] }
  ) => request<TrialEnvelope>(`/api/try/${id}/persona`, { method: "PATCH", body: JSON.stringify(body) }),
  call: (id: string) =>
    request<{
      agentId: string;
      signedUrl: string;
      overrides: {
        agent: { prompt: { prompt: string }; firstMessage: string; language: string };
        tts: { voiceId: string };
      };
    }>(`/api/try/${id}/call`, { method: "POST" }),
  transcript: (id: string, turns: Array<{ role: "agent" | "user"; text: string; at: number }>) =>
    request<TrialEnvelope>(`/api/try/${id}/transcript`, {
      method: "POST",
      body: JSON.stringify({ turns }),
    }),
  lead: (
    id: string,
    body: { name: string; phone: string; email: string; answers?: { missedCalls?: string; ticket?: string } }
  ) =>
    request<{
      ok: true;
      callStatus: "placed" | "unavailable" | "failed" | "busy";
      phone: string;
      fields?: Record<string, string>;
    }>(`/api/try/${id}/lead`, { method: "POST", body: JSON.stringify(body) }),
  voices: () =>
    request<{
      voices: Array<{ id: string; label: string; description: string; accent: string; gender: string; previewUrl: string | null }>;
    }>("/api/try/voices"),
};
