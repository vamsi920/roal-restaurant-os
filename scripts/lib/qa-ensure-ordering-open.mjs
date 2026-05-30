/**
 * Ensures QA restaurant can sync/finalize orders (Edge hours gate).
 * Upserts today's hours exception as open when ordering_allowed is false.
 */
import { createClient } from "@supabase/supabase-js";

function localDateInTimeZone(timeZone) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} sb
 * @param {string} restaurantId
 * @returns {Promise<{ opened: boolean; detail: string }>}
 */
export async function ensureQaOrderingOpen(sb, restaurantId) {
  const { data: profile } = await sb
    .from("restaurant_profiles")
    .select("timezone, temporarily_closed")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (profile?.temporarily_closed) {
    await sb
      .from("restaurant_profiles")
      .update({ temporarily_closed: false, temporarily_closed_reason: null })
      .eq("restaurant_id", restaurantId);
  }

  const tz =
    typeof profile?.timezone === "string" && profile.timezone.trim()
      ? profile.timezone.trim()
      : "America/Chicago";
  const exceptionDate = localDateInTimeZone(tz);

  const { error } = await sb.from("restaurant_hours_exceptions").upsert(
    {
      restaurant_id: restaurantId,
      exception_date: exceptionDate,
      label: "ROAL QA open window",
      is_closed: false,
      open_time: "00:00:00",
      close_time: "23:59:00",
    },
    { onConflict: "restaurant_id,exception_date" }
  );

  if (error) {
    return { opened: false, detail: error.message };
  }

  return {
    opened: true,
    detail: `exception ${exceptionDate} (${tz}) 00:00–23:59`,
  };
}
