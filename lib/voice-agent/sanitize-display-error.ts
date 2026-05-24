/** Redact likely secrets before showing ElevenLabs/sync errors in the UI. */
export function sanitizeVoiceAgentDisplayError(
  message: string | null | undefined
): string | null {
  if (!message?.trim()) return null;
  let out = message.trim().slice(0, 500);
  const patterns: RegExp[] = [
    /\bsk-[a-zA-Z0-9]{16,}\b/g,
    /\broal1\.[a-zA-Z0-9._-]+/gi,
    /\bBearer\s+[a-zA-Z0-9._-]+/gi,
    /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/g,
    /(api[_-]?key|secret|password|token)\s*[:=]\s*['"]?[^\s'"]{8,}/gi,
  ];
  for (const re of patterns) {
    out = out.replace(re, "[redacted]");
  }
  return out;
}
