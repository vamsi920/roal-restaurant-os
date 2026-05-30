import type { AgentCallOutcome, AgentCallStatus } from "@/lib/agent-calls/types";

export type CommandCenterCallRow = {
  sessionId: string;
  conversationId: string;
  callerPhone: string | null;
  status: AgentCallStatus;
  outcome: AgentCallOutcome;
  startedAt: string;
  endedAt: string | null;
  lastActivityAt: string;
  lineCount: number;
  toolErrorCount: number;
  handoffSignals: string[];
};

export type CommandCenterCompletedOrder = {
  sessionId: string;
  completedAt: string;
  callerPhone: string | null;
  customerName: string | null;
  lineCount: number;
};

export type CommandCenterCounts = {
  active: number;
  completed: number;
  failed: number;
  handoff: number;
  unknown: number;
};

export type RestaurantCommandCenterSnapshot = {
  restaurantId: string;
  restaurantName: string;
  linkedAgentId: string | null;
  rangeSince: string;
  rangeUntil: string;
  activeCalls: CommandCenterCallRow[];
  completedOrders: CommandCenterCompletedOrder[];
  failedCalls: CommandCenterCallRow[];
  handoffCalls: CommandCenterCallRow[];
  unknownCalls: CommandCenterCallRow[];
  counts: CommandCenterCounts;
  /** True when every bucket is empty (no operational activity in range). */
  isEmpty: boolean;
};
