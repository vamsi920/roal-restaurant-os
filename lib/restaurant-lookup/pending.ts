import { cookies } from "next/headers";
import {
  decodeLookupCookie,
  LOOKUP_COOKIE_NAME,
} from "@/lib/restaurant-lookup/cookie";
import type { LookupCookiePayload } from "@/lib/restaurant-lookup/types";

export function readPendingRestaurantLookup(): LookupCookiePayload | null {
  return decodeLookupCookie(cookies().get(LOOKUP_COOKIE_NAME)?.value);
}
