import { getGooglePlacesApiKey } from "@/lib/env.server";
import { weeklyHoursFromPlacesPeriods } from "@/lib/restaurant-lookup/hours";
import type {
  PlaceCandidate,
  PlaceProfileFields,
  PlaceSnapshot,
} from "@/lib/restaurant-lookup/types";

const PLACES_BASE = "https://places.googleapis.com/v1";

const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
].join(",");

const DETAIL_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "regularOpeningHours",
  "timeZone",
  "addressComponents",
  "primaryType",
  "types",
].join(",");

type PlacesAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type PlacesPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  timeZone?: { id?: string };
  primaryType?: string;
  types?: string[];
  addressComponents?: PlacesAddressComponent[];
  regularOpeningHours?: {
    periods?: Array<{
      open?: { day?: number; hour?: number; minute?: number };
      close?: { day?: number; hour?: number; minute?: number };
    }>;
  };
};

function component(
  parts: PlacesAddressComponent[] | undefined,
  type: string,
  short = false
): string | null {
  const row = parts?.find((p) => p.types?.includes(type));
  const value = short ? row?.shortText ?? row?.longText : row?.longText ?? row?.shortText;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function asPhone(place: PlacesPlace): string | null {
  const raw = (place.internationalPhoneNumber || place.nationalPhoneNumber || "").trim();
  if (!raw) return null;
  return raw.slice(0, 24);
}

function asWebsite(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function profileFromPlace(place: PlacesPlace, fallbackName: string): PlaceProfileFields {
  const parts = place.addressComponents;
  const streetNumber = component(parts, "street_number");
  const route = component(parts, "route");
  const street =
    streetNumber && route
      ? `${streetNumber} ${route}`
      : route || streetNumber || place.formattedAddress?.split(",")[0]?.trim() || null;
  const country = (component(parts, "country", true) || "US").slice(0, 2).toUpperCase();
  const timezone = place.timeZone?.id?.trim() || "America/Chicago";

  return {
    name: place.displayName?.text?.trim() || fallbackName,
    phone: asPhone(place),
    address_line1: street,
    address_line2: null,
    city: component(parts, "locality") || component(parts, "postal_town"),
    region: component(parts, "administrative_area_level_1", true),
    postal_code: component(parts, "postal_code"),
    country: /^[A-Z]{2}$/.test(country) ? country : "US",
    timezone,
    website: asWebsite(place.websiteUri),
  };
}

export function snapshotFromPlace(place: PlacesPlace, fallbackName: string): PlaceSnapshot | null {
  const placeId = place.id?.trim();
  if (!placeId) return null;
  return {
    place_id: placeId,
    maps_url: place.googleMapsUri?.trim() || null,
    profile: profileFromPlace(place, fallbackName),
    weekly_hours: weeklyHoursFromPlacesPeriods(place.regularOpeningHours?.periods),
    cuisine: cuisineFromPlaceTypes(place),
  };
}

/** "indian_restaurant" → "indian"; ignores generic types like "restaurant" or "meal_takeaway". */
export function cuisineFromPlaceTypes(place: Pick<PlacesPlace, "primaryType" | "types">): string | null {
  const generic = new Set(["restaurant", "fast_food", "meal_takeaway", "meal_delivery", "food", "point_of_interest", "establishment", "store"]);
  for (const t of [place.primaryType, ...(place.types ?? [])]) {
    const m = t?.match(/^([a-z_]+?)_(restaurant|shop|house|bar)$/);
    const kind = m?.[1];
    if (kind && !generic.has(kind)) return kind.replace(/_/g, " ");
  }
  return null;
}

export function candidateFromPlace(place: PlacesPlace): PlaceCandidate | null {
  const placeId = place.id?.trim();
  const name = place.displayName?.text?.trim();
  if (!placeId || !name) return null;
  return {
    place_id: placeId,
    name,
    address: place.formattedAddress?.trim() || null,
    phone: asPhone(place),
    website: asWebsite(place.websiteUri),
    maps_url: place.googleMapsUri?.trim() || null,
  };
}

async function placesFetch(path: string, init: RequestInit, fieldMask: string): Promise<unknown> {
  const key = getGooglePlacesApiKey();
  const res = await fetch(`${PLACES_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": fieldMask,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? JSON.stringify((data as { error: unknown }).error)
        : `${res.status}`;
    throw new Error(`Places request failed: ${message}`);
  }
  return data;
}

export async function searchRestaurantPlaces(name: string, city: string): Promise<PlaceCandidate[]> {
  const data = (await placesFetch(
    "/places:searchText",
    {
      method: "POST",
      body: JSON.stringify({
        textQuery: `${name} ${city}`,
        includedType: "restaurant",
        maxResultCount: 5,
      }),
    },
    SEARCH_FIELD_MASK
  )) as { places?: PlacesPlace[] };

  return (data.places ?? [])
    .map((place) => candidateFromPlace(place))
    .filter((row): row is PlaceCandidate => Boolean(row));
}

export async function getRestaurantPlaceSnapshot(
  placeId: string,
  fallbackName: string
): Promise<PlaceSnapshot | null> {
  const encoded = encodeURIComponent(placeId.replace(/^places\//, ""));
  const place = (await placesFetch(`/places/${encoded}`, { method: "GET" }, DETAIL_FIELD_MASK)) as PlacesPlace;
  return snapshotFromPlace(place, fallbackName);
}

const snapshotCache = new Map<string, { snapshot: PlaceSnapshot; storedAt: number }>();
const SNAPSHOT_TTL_MS = 30 * 60 * 1000;

export function cachePlaceSnapshot(snapshot: PlaceSnapshot, now = Date.now()): void {
  snapshotCache.set(snapshot.place_id, { snapshot, storedAt: now });
}

export function getCachedPlaceSnapshot(placeId: string, now = Date.now()): PlaceSnapshot | null {
  const row = snapshotCache.get(placeId);
  if (!row) return null;
  if (now - row.storedAt > SNAPSHOT_TTL_MS) {
    snapshotCache.delete(placeId);
    return null;
  }
  return row.snapshot;
}

export async function loadPlaceSnapshot(
  placeId: string,
  fallbackName: string
): Promise<PlaceSnapshot | null> {
  const cached = getCachedPlaceSnapshot(placeId);
  if (cached) return cached;
  const snapshot = await getRestaurantPlaceSnapshot(placeId, fallbackName);
  if (snapshot) cachePlaceSnapshot(snapshot);
  return snapshot;
}
