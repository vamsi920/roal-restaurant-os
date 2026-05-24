/** Trim and collapse internal whitespace for menu labels. */
export function normalizeMenuName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function menuNamesEqual(a: string, b: string): boolean {
  return (
    normalizeMenuName(a).toLowerCase() === normalizeMenuName(b).toLowerCase()
  );
}

/** Round to cents for numeric(10,2) storage. */
export function roundMenuPrice(value: number): number {
  return Math.round(value * 100) / 100;
}
