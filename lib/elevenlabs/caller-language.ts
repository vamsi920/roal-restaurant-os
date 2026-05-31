type JsonRecord = Record<string, unknown>;

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
  hi: "Hindi",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  vi: "Vietnamese",
  tl: "Tagalog",
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    const str = asString(value);
    if (str) return str;
  }
  return "";
}

/** Normalize ElevenLabs / ISO language codes to a short lowercase tag (e.g. es, en). */
export function normalizeCallerLanguageCode(
  value: string | null | undefined
): string | null {
  const raw = asString(value);
  if (!raw) return null;
  const base = raw.toLowerCase().split(/[-_]/)[0];
  if (!/^[a-z]{2,3}$/.test(base)) return null;
  return base;
}

export function callerLanguageLabel(
  code: string | null | undefined
): string | null {
  const normalized = normalizeCallerLanguageCode(code);
  if (!normalized) return null;
  return LANGUAGE_LABELS[normalized] ?? normalized.toUpperCase();
}

export function readCallerLanguageFromPostCallData(data: JsonRecord): string | null {
  const metadata = data.metadata && typeof data.metadata === "object"
    ? (data.metadata as JsonRecord)
    : {};
  const analysis = data.analysis && typeof data.analysis === "object"
    ? (data.analysis as JsonRecord)
    : {};
  const initiation =
    data.conversation_initiation_client_data &&
    typeof data.conversation_initiation_client_data === "object"
      ? (data.conversation_initiation_client_data as JsonRecord)
      : {};
  const dynamicVars =
    initiation.dynamic_variables &&
    typeof initiation.dynamic_variables === "object"
      ? (initiation.dynamic_variables as JsonRecord)
      : {};

  return (
    normalizeCallerLanguageCode(
      firstString(
        data.caller_language,
        data.callerLanguage,
        data.language,
        data.main_language,
        metadata.caller_language,
        metadata.callerLanguage,
        metadata.language,
        metadata.main_language,
        metadata.detected_language,
        analysis.language,
        analysis.detected_language,
        dynamicVars.caller_language,
        dynamicVars.language
      )
    ) ?? null
  );
}

export function readCallerLanguageFromTranscriptMetadata(
  metadata: JsonRecord | null | undefined
): string | null {
  if (!metadata) return null;
  return (
    normalizeCallerLanguageCode(
      firstString(
        metadata.caller_language,
        metadata.callerLanguage,
        metadata.language,
        metadata.main_language,
        metadata.detected_language
      )
    ) ?? null
  );
}
