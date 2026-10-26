import type { WeeklyHourInput } from "@/lib/restaurant-hours/core";
import type { ScannedMenu } from "@/lib/menu-import/types";

export type PlaceCandidate = {
  place_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  maps_url: string | null;
};

export type PlaceProfileFields = {
  name: string;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string;
  timezone: string;
  website: string | null;
};

export type PlaceSnapshot = {
  place_id: string;
  maps_url: string | null;
  profile: PlaceProfileFields;
  weekly_hours: WeeklyHourInput[] | null;
};

export type LookupCookiePayload = {
  v: 1;
  placeId: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  exp: number;
};

export type WebsiteMenuImportResult =
  | { ok: true; menu: ScannedMenu; sourceUrl: string; modelUsed: string }
  | {
      ok: false;
      reason: "no_website" | "empty" | "unpriced" | "fetch_failed" | "parse_failed";
      message: string;
    };
