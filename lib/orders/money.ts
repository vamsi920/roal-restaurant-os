/** Round to nearest cent (half-up). */
export function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function dollarsToCents(amount: number): number {
  return Math.round(roundCents(amount) * 100);
}

export function centsToDollars(cents: number): number {
  return roundCents(cents / 100);
}

export function formatMoney(amount: number | null, currency = "USD"): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function formatPercent(rate: number): string {
  const trimmed = rate % 1 === 0 ? rate.toFixed(0) : rate.toFixed(2);
  return `${trimmed}%`;
}
