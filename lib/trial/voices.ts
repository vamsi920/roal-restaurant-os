import type { TrialPersona } from "@/lib/trial/types";

export type TrialVoiceOption = {
  id: string;
  label: string;
  description: string;
  accent: string;
  gender: "female" | "male";
  /** Voice Library owner: the voice is added to the ElevenLabs account on first use. */
  libraryOwnerId?: string;
  /** Cuisine / name keywords that make this the automatic pick. */
  cuisines?: readonly string[];
};

/**
 * Curated voices. The first block is ElevenLabs premades (on every account); the accent block
 * comes from the Voice Library and is matched to the restaurant's cuisine so an Indian spot
 * sounds like an Indian host, a taqueria like a Mexican one, and so on.
 */
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
  // Caribbean sits before Indian so "West Indian" matches here first.
  {
    id: "mrDMz4sYNCz18XYFpmyV",
    label: "Nicole",
    description: "Rich and warm. Island hospitality.",
    accent: "Caribbean",
    gender: "female",
    libraryOwnerId: "8659effdce14597c3990a54c54463217e69181cab02d3dfac0f03b09f8aeed91",
    cuisines: ["caribbean", "jamaican", "west indian", "trinidad", "haitian", "jerk"],
  },
  {
    id: "90ipbRoKi4CpHXvKVtl0",
    label: "Anika",
    description: "Warm and attentive. Made for customer calls.",
    accent: "Indian",
    gender: "female",
    libraryOwnerId: "f87f057c2250691953ac2e6227859706764bd08c88a055a18c74261957885a51",
    cuisines: [
      "indian", "desi", "punjabi", "gujarati", "biryani", "dosa", "tandoor", "masala", "chaat",
      "curry", "nepali", "nepalese", "himalayan", "pakistani", "bangladeshi", "sri lankan", "bombay",
    ],
  },
  {
    id: "2iAXJEMO2o0PqUHzvZwQ",
    label: "Ranbir",
    description: "Calm and clear. Mature, easy to follow.",
    accent: "Indian",
    gender: "male",
    libraryOwnerId: "7398804d9eaf2f463899a907587c33a390591775784f87857b6d0e1e4e3e66f6",
  },
  {
    id: "3l9iCMrNSRR0w51JvFB0",
    label: "Leo",
    description: "Relaxed and natural. Mexican-American warmth.",
    accent: "Latin American",
    gender: "male",
    libraryOwnerId: "06dcbf6ce9d6464e4497f300c1e9b80bec6c84fe48b9b23e2c73b36dd0cf0c28",
    cuisines: [
      "mexican", "taco", "taqueria", "tex-mex", "latin", "salvador", "hondur", "guatemal", "peruvian",
      "colombian", "venezuelan", "cuban", "puerto ric", "spanish", "tapas", "argentin", "burrito", "empanada",
    ],
  },
  {
    id: "LaDXAXAod3qiAkyfwUSV",
    label: "Juliano",
    description: "Easygoing and friendly. Brazilian accent.",
    accent: "Brazilian",
    gender: "male",
    libraryOwnerId: "0df0316bef3afd4d681ef871016ca64bb956c534a528d6a681592bcbc44e8237",
    cuisines: ["brazil", "churrasc", "portuguese"],
  },
  {
    id: "iLVmqjzCGGvqtMCk6vVQ",
    label: "Antonio",
    description: "Lively and charming. Italian accent.",
    accent: "Italian",
    gender: "male",
    libraryOwnerId: "821a89126651c36a28e155f38dfd0a291e14703a16299e8b6d2af09547715080",
    cuisines: ["italian", "pizza", "trattoria", "pasta", "osteria", "sicilian", "neapolitan", "ristorante"],
  },
  {
    id: "zmcVlqmyk3Jpn5AVYcAL",
    label: "Sapphire",
    description: "Sweet and clear. Light Hong Kong accent.",
    accent: "Chinese",
    gender: "female",
    libraryOwnerId: "14398d60abd4ae6f0fe0da3f29626e208a04d4cdbd4bfc7e55a5ea81421cae8a",
    cuisines: ["chinese", "cantonese", "szechuan", "sichuan", "dim sum", "hunan", "taiwanese", "hong kong", "dumpling", "hot pot"],
  },
  {
    id: "u6a6bRv82Zfi9NzoIqvt",
    label: "Lia",
    description: "Polite and fluent. Japanese accent.",
    accent: "Japanese",
    gender: "female",
    libraryOwnerId: "c175136d2654486b92e9a2c2e83bc31dee510255df7d5e5d6c7e729234851d99",
    cuisines: ["japanese", "sushi", "ramen", "izakaya", "udon", "teriyaki", "hibachi", "omakase"],
  },
  {
    id: "fwH9jZjJVWYg6qwyWr01",
    label: "Jeongki",
    description: "Upbeat and expressive. Korean accent.",
    accent: "Korean",
    gender: "male",
    libraryOwnerId: "d825f88e5f968030519c39f227ed04a0ff3f1f19586d8ef35e34a1dd1c3d47fb",
    cuisines: ["korean", "bibimbap", "bulgogi"],
  },
  {
    id: "bYPMZKhwcPc8RK0LuBpt",
    label: "Salma",
    description: "Warm and composed. Levantine Arabic accent.",
    accent: "Middle Eastern",
    gender: "female",
    libraryOwnerId: "7398804d9eaf2f463899a907587c33a390591775784f87857b6d0e1e4e3e66f6",
    cuisines: [
      "lebanese", "middle east", "mediterranean", "syrian", "palestinian", "jordanian", "egyptian",
      "moroccan", "arab", "shawarma", "falafel", "halal", "persian", "iranian", "afghan", "yemeni", "iraqi",
    ],
  },
  {
    id: "BswWMuKdblU4qjn1bVW7",
    label: "Arda",
    description: "Warm and relaxed. Turkish accent.",
    accent: "Turkish",
    gender: "male",
    libraryOwnerId: "4377cd25aee3093ab4d7d594a20aa355a66c44b65febba935904d068858db775",
    cuisines: ["turkish", "doner", "döner"],
  },
  {
    id: "1hIScOW98xkqE5ttC10C",
    label: "Mariva",
    description: "Warm and welcoming. French accent.",
    accent: "French",
    gender: "female",
    libraryOwnerId: "157c9fb2dca64bb35f10d679f1285f7682eae13c6edbaa42d414a6dc49ec1477",
    cuisines: ["french", "bistro", "brasserie", "creperie", "crêperie", "patisserie"],
  },
  {
    id: "t6WJWTYTryhcQnrBHdCr",
    label: "Louisamay",
    description: "Upbeat and friendly. Irish accent.",
    accent: "Irish",
    gender: "female",
    libraryOwnerId: "e4e2d2b45503cb10b3abd90e77b384aeea7e252eb5e4dc328235e384db4a17d8",
    cuisines: ["irish"],
  },
  {
    id: "eOHsvebhdtt0XFeHVMQY",
    label: "Olabisi",
    description: "Warm and relatable. West African accent.",
    accent: "West African",
    gender: "female",
    libraryOwnerId: "47ae34c1cfdc2feb6d8b9b70a6b5637afc4b57a34667bb2342fd57a982a2bb57",
    cuisines: ["nigerian", "ghanaian", "west african", "senegalese", "jollof"],
  },
  {
    id: "2WM58lWaTXuuBkN1puHx",
    label: "Jane",
    description: "Clear and cheerful. Filipino accent.",
    accent: "Filipino",
    gender: "female",
    libraryOwnerId: "6f39ef6fabd4c1986eb7bc4ca7a217afdc51e32c27f97fd3f536e8e984d0b8c6",
    cuisines: ["filipino", "philippine", "pinoy"],
  },
  {
    id: "Jvf6TAXwMUVTSR20U0f9",
    label: "Klaus",
    description: "Warm baritone. German accent.",
    accent: "German",
    gender: "male",
    libraryOwnerId: "bc00a8580b93152a9f05dfd2a01d208731202b2105a3e9ba65e30362c8b0cb92",
    cuisines: ["german", "bavarian", "biergarten", "schnitzel"],
  },
] as const;

export const DEFAULT_TRIAL_VOICE = TRIAL_VOICE_OPTIONS[0];

/** The accent voice that fits a cuisine (checked first) or restaurant name, if any. */
export function voiceForCuisine(
  cuisine: string | null | undefined,
  restaurantName?: string | null
): TrialVoiceOption | null {
  for (const text of [cuisine, restaurantName]) {
    const hay = text?.toLowerCase().trim();
    if (!hay) continue;
    const match = TRIAL_VOICE_OPTIONS.find((v) => v.cuisines?.some((k) => hay.includes(k)));
    if (match) return match;
  }
  return null;
}

export function findTrialVoice(voiceId: string | null | undefined): TrialVoiceOption | null {
  const id = voiceId?.trim();
  if (!id) return null;
  return TRIAL_VOICE_OPTIONS.find((v) => v.id === id) ?? null;
}

/**
 * The host is named after its voice (Anika for an Indian kitchen, Leo for a taqueria),
 * never after the restaurant or another product. Owners can still rename it.
 */
export function defaultAgentName(voiceId?: string | null): string {
  return (findTrialVoice(voiceId) ?? DEFAULT_TRIAL_VOICE).label;
}

/** An owner-picked voice wins; otherwise the cuisine's accent voice; otherwise the default. */
export function resolveTrialPersona(
  persona: Partial<TrialPersona> | null | undefined,
  restaurantName?: string | null,
  cuisine?: string | null
): TrialPersona {
  const voice =
    findTrialVoice(persona?.voiceId) ?? voiceForCuisine(cuisine, restaurantName) ?? DEFAULT_TRIAL_VOICE;
  return {
    agentName: persona?.agentName?.trim() || voice.label,
    voiceId: voice.id,
    voiceLabel: voice.label,
    language: persona?.language?.trim() || "en",
  };
}
