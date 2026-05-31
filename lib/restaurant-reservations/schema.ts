export const RESERVATION_REQUEST_STATUSES = [
  "requested",
  "contacted",
  "confirmed",
  "declined",
  "canceled",
] as const;

export type ReservationRequestStatus =
  (typeof RESERVATION_REQUEST_STATUSES)[number];

export const RESERVATION_OWNER_UPDATE_STATUSES = [
  "contacted",
  "confirmed",
  "declined",
  "canceled",
] as const;

export type ReservationOwnerUpdateStatus =
  (typeof RESERVATION_OWNER_UPDATE_STATUSES)[number];

export function normalizeReservationStatus(
  raw: string
): ReservationRequestStatus {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "closed") return "canceled";
  if (
    (RESERVATION_REQUEST_STATUSES as readonly string[]).includes(normalized)
  ) {
    return normalized as ReservationRequestStatus;
  }
  return "requested";
}

export function isReservationOwnerUpdateStatus(
  status: string
): status is ReservationOwnerUpdateStatus {
  return (RESERVATION_OWNER_UPDATE_STATUSES as readonly string[]).includes(
    status
  );
}

export function isOpenReservationStatus(status: string): boolean {
  const normalized = normalizeReservationStatus(status);
  return normalized === "requested" || normalized === "contacted";
}

export function reservationStatusLabel(status: string): string {
  switch (normalizeReservationStatus(status)) {
    case "requested":
      return "Requested";
    case "contacted":
      return "Contacted";
    case "confirmed":
      return "Confirmed";
    case "declined":
      return "Declined";
    case "canceled":
      return "Closed";
  }
}

export function reservationStatusChipClass(status: string): string {
  switch (normalizeReservationStatus(status)) {
    case "requested":
      return "bg-accent-soft text-accent";
    case "contacted":
      return "bg-warning/15 text-amber-900";
    case "confirmed":
      return "bg-success/15 text-success";
    case "declined":
      return "bg-danger/10 text-danger";
    case "canceled":
      return "bg-elev text-muted";
  }
}

export function reservationNextOwnerAction(status: string): string {
  switch (normalizeReservationStatus(status)) {
    case "requested":
      return "Contact guest to confirm availability";
    case "contacted":
      return "Confirm table or decline request";
    case "confirmed":
      return "Table confirmed — no further action";
    case "declined":
      return "Declined — no further action";
    case "canceled":
      return "Closed — no further action";
  }
}

export function buildReservationBySessionMap(
  rows: Array<{ sessionId: string | null; status: string }>
): Map<string, { status: ReservationRequestStatus }> {
  const map = new Map<string, { status: ReservationRequestStatus }>();
  for (const row of rows) {
    const sessionId = row.sessionId?.trim();
    if (!sessionId) continue;
    map.set(sessionId, {
      status: normalizeReservationStatus(row.status),
    });
  }
  return map;
}
