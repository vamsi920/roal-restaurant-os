import {
  LANDING_DEMO,
  type LandingOrderLine,
  type LandingPreviewData,
} from "@/lib/landing-demo-data";

export type KitchenTicketStatusStep = {
  id: string;
  label: string;
  state: "done" | "active" | "upcoming";
};

export type KitchenTicketPreviewModel = {
  restaurantName: string;
  onCall: boolean;
  guestName: string | null;
  guestPhone: string | null;
  sessionLabel: string;
  items: LandingOrderLine[];
  prepSteps: KitchenTicketStatusStep[];
  updatedLabel: string;
  itemCount: number;
  source: "demo" | "live";
};

function formatUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Chicago",
    });
  } catch {
    return "Just now";
  }
}

function truncateSession(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 10)}…`;
}

export function buildKitchenTicketPreview(data: LandingPreviewData): KitchenTicketPreviewModel {
  const draft = data.liveDraft ?? LANDING_DEMO.liveDraft;
  const items = draft?.items ?? [];
  const updatedAt = draft?.updated_at ?? "2026-05-23T19:39:00.000Z";

  const prepSteps: KitchenTicketStatusStep[] = [
    { id: "draft", label: "Live cart", state: items.length > 0 ? "done" : "active" },
    { id: "new", label: "Ticket on kitchen screen", state: items.length > 0 ? "active" : "upcoming" },
    { id: "accepted", label: "Kitchen accepted", state: "upcoming" },
    { id: "ready", label: "Ready for pickup", state: "upcoming" },
  ];

  return {
    restaurantName: data.restaurantName,
    onCall: true,
    guestName: draft?.customer_name ?? null,
    guestPhone: draft?.customer_phone ?? null,
    sessionLabel: draft ? truncateSession(draft.session_id) : "call_demo",
    items,
    prepSteps,
    updatedLabel: formatUpdated(updatedAt),
    itemCount: items.reduce((n, l) => n + l.quantity, 0),
    source: data.source,
  };
}
