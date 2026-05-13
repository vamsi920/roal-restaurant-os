/** Extract project ref from https://<ref>.supabase.co */
export function supabaseProjectRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const m = host.match(/^([^.]+)\.supabase\.co$/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}
