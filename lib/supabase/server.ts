import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getServiceRoleKey } from "@/lib/env.server";
import { getPublicEnv } from "@/lib/env.public";

export async function createServerSupabase(): Promise<SupabaseClient> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } =
    getPublicEnv();
  const cookieStore = cookies();

  return createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll from Server Component — middleware refreshes session
          }
        },
      },
    }
  );
}

/** Session-aware Supabase client (uses auth cookies). */
export const getServerSupabase = createServerSupabase;

/** Bypasses RLS; use only from trusted server routes (e.g. menu clear). */
export function getServiceRoleSupabase(): SupabaseClient | null {
  const key = getServiceRoleKey();
  if (!key) return null;
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  return createClient(NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
