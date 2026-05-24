"use server";

import {
  connectVoiceAgentAction,
  type ConnectVoiceAgentInput,
} from "./voice-agent-actions";

export type ConnectElevenLabsAgentInput = ConnectVoiceAgentInput;

/** @deprecated Use connectVoiceAgentAction */
export async function connectElevenLabsAgentToRestaurantAction(
  input: ConnectElevenLabsAgentInput
) {
  const { sync, profile } = await connectVoiceAgentAction(input);
  return { sync, profile };
}
