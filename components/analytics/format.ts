export function formatUsdFromCents(cents: number | null, complete: boolean): string {
  if (cents == null) return "—";
  const value = cents / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
  return complete ? formatted : `${formatted}+`;
}

export function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${value}%`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}
