import { redactDeliveryErrorMessage } from "@/lib/notifications/redact";
import { sanitizeVoiceAgentDisplayError } from "@/lib/voice-agent/sanitize-display-error";

/** Redact secrets/URLs before showing ops errors in the admin console. */
export function sanitizeOpsErrorDetail(
  text: string | null | undefined,
  max = 280
): string {
  const sanitized =
    sanitizeVoiceAgentDisplayError(text) ??
    (text?.trim() ? text.trim().slice(0, 500) : null);
  if (!sanitized) return "";
  const redacted = redactDeliveryErrorMessage(sanitized) ?? sanitized;
  if (redacted.length <= max) return redacted;
  return `${redacted.slice(0, max)}…`;
}
