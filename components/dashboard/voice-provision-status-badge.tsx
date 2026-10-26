import { cn } from "@/lib/cn";
import type {
  RestaurantProfileProvisionFields,
  VoiceProvisionUiState,
} from "@/lib/voice-agent/provision-display";
import {
  voiceProvisionBadgeLabel,
  voiceProvisionBadgeTitle,
} from "@/lib/voice-agent/provision-display";

type Props = {
  state: VoiceProvisionUiState;
  profile?: RestaurantProfileProvisionFields | null;
  className?: string;
  compact?: boolean;
};

const STATE_CLASS: Record<Exclude<VoiceProvisionUiState, "not_started">, string> = {
  ready: "chip--success voice-provision-badge--ready",
  in_progress: "chip--warning voice-provision-badge--progress",
  needs_attention: "chip--danger voice-provision-badge--attention",
};

const STATE_LABEL: Record<Exclude<VoiceProvisionUiState, "not_started">, string> = {
  ready: "Host ready",
  in_progress: "Setting up host",
  needs_attention: "Host needs attention",
};

export function VoiceProvisionStatusBadge({
  state,
  profile = null,
  className,
  compact = false,
}: Props) {
  if (state === "not_started") return null;

  const label = voiceProvisionBadgeLabel(state);
  if (!label) return null;

  const title = voiceProvisionBadgeTitle(state, profile);

  return (
    <span
      className={cn(
        "chip voice-provision-badge",
        compact && "voice-provision-badge--compact",
        STATE_CLASS[state],
        className
      )}
      title={title}
    >
      {state === "in_progress" ? (
        <span className="voice-provision-badge__dot animate-pulse" aria-hidden />
      ) : null}
      <span className="voice-provision-badge__label">{STATE_LABEL[state]}</span>
    </span>
  );
}
