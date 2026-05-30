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

const STATE_CLASS: Record<
  Exclude<VoiceProvisionUiState, "not_started">,
  string
> = {
  ready: "voice-provision-badge--ready",
  in_progress: "voice-provision-badge--progress",
  needs_attention: "voice-provision-badge--attention",
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
  const toneClass = STATE_CLASS[state];

  return (
    <span
      className={cn(
        "voice-provision-badge",
        compact && "voice-provision-badge--compact",
        toneClass,
        className
      )}
      title={title}
    >
      {state === "in_progress" ? (
        <span className="voice-provision-badge__dot" aria-hidden />
      ) : null}
      <span className="voice-provision-badge__label">{label}</span>
    </span>
  );
}
