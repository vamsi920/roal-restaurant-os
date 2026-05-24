/** Fixed illustrative KDS motion beats — not loaded from the database. */

export type KdsMotionStatus = "draft" | "new" | "accepted" | "ready";

export type KdsMotionLine = {
  name: string;
  quantity: number;
  customizations: string[];
};

export const KDS_MOTION_DEMO = {
  restaurantName: "Joe's Corner Kitchen",
  sessionLabel: "call_8f2a",
  guestName: "Alex",
  guestPhone: "(512) 555-0142",
  line: {
    name: "Spicy tuna poke",
    quantity: 1,
  },
  modifiers: ["Extra tuna", "Mild spice"],
  statusLabels: {
    draft: "Live cart",
    new: "New order",
    accepted: "Accepted",
    ready: "Ready for pickup",
  } satisfies Record<KdsMotionStatus, string>,
} as const;

export function kdsMotionStatusFromProgress(progress: number): KdsMotionStatus {
  const p = Math.max(0, Math.min(1, progress));
  if (p < 0.48) return "draft";
  if (p < 0.62) return "new";
  if (p < 0.86) return "accepted";
  return "ready";
}

export function kdsMotionModifiersVisible(progress: number): boolean {
  return progress >= 0.24;
}

export function kdsMotionTicketEntered(progress: number): boolean {
  return progress >= 0.08;
}

export function kdsMotionPrepSteps(progress: number) {
  type State = "done" | "active" | "upcoming";
  const p = Math.max(0, Math.min(1, progress));

  const stateFor = (start: number, end: number): State => {
    if (p >= end) return "done";
    if (p >= start) return "active";
    return "upcoming";
  };

  return [
    { id: "draft", label: "Live cart", state: stateFor(0, 0.24) },
    { id: "kds", label: "Ticket on kitchen screen", state: stateFor(0.24, 0.48) },
    { id: "accepted", label: "Kitchen accepted", state: stateFor(0.48, 0.86) },
    { id: "ready", label: "Ready for pickup", state: p >= 0.86 ? "active" : "upcoming" },
  ] as const;
}

export function kdsMotionLine(progress: number): KdsMotionLine {
  return {
    ...KDS_MOTION_DEMO.line,
    quantity: KDS_MOTION_DEMO.line.quantity,
    customizations: kdsMotionModifiersVisible(progress) ? [...KDS_MOTION_DEMO.modifiers] : [],
  };
}
