import type { TrialPersona } from "@/lib/trial/types";

export type TrialVoiceOption = {
  id: string;
  label: string;
  description: string;
  accent: string;
  gender: "female" | "male";
};

/** Curated ElevenLabs premade voices (available on every account). */
export const TRIAL_VOICE_OPTIONS: readonly TrialVoiceOption[] = [
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    label: "Sarah",
    description: "Warm and reassuring. Great for family spots.",
    accent: "American",
    gender: "female",
  },
  {
    id: "cgSgspJ2msm6clMCkdW9",
    label: "Jessica",
    description: "Bright and upbeat. Keeps the line moving.",
    accent: "American",
    gender: "female",
  },
  {
    id: "nPczCjzI2devNBz1zQrb",
    label: "Brian",
    description: "Deep and calm. Sounds like a seasoned host.",
    accent: "American",
    gender: "male",
  },
  {
    id: "IKne3meq5aSn9XLyUdCD",
    label: "Charlie",
    description: "Relaxed and natural. Casual counter energy.",
    accent: "Australian",
    gender: "male",
  },
  {
    id: "Xb7hH8MSUJpSbSDYk0k2",
    label: "Alice",
    description: "Clear and confident. Polished front of house.",
    accent: "British",
    gender: "female",
  },
  {
    id: "TX3LPaxmHKxFdv7VOQHJ",
    label: "Liam",
    description: "Friendly and energetic. Fast-casual favorite.",
    accent: "American",
    gender: "male",
  },
] as const;

export const DEFAULT_TRIAL_VOICE = TRIAL_VOICE_OPTIONS[0];

export function findTrialVoice(voiceId: string | null | undefined): TrialVoiceOption | null {
  const id = voiceId?.trim();
  if (!id) return null;
  return TRIAL_VOICE_OPTIONS.find((v) => v.id === id) ?? null;
}

export function defaultAgentName(): string {
  return "Addy";
}

export function resolveTrialPersona(
  persona: Partial<TrialPersona> | null | undefined,
  // Reserved: restaurant-aware default names.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  restaurantName?: string | null
): TrialPersona {
  const voice = findTrialVoice(persona?.voiceId) ?? DEFAULT_TRIAL_VOICE;
  return {
    agentName: persona?.agentName?.trim() || defaultAgentName(),
    voiceId: voice.id,
    voiceLabel: voice.label,
    language: persona?.language?.trim() || "en",
  };
}
