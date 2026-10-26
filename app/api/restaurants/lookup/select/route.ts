import { NextResponse } from "next/server";
import { EnvValidationError } from "@/lib/env.shared";
import { hasGooglePlacesApiKey } from "@/lib/env.server";
import {
  encodeLookupCookie,
  lookupCookieOptions,
  LOOKUP_COOKIE_NAME,
} from "@/lib/restaurant-lookup/cookie";
import {
  cachePlaceSnapshot,
  getRestaurantPlaceSnapshot,
} from "@/lib/restaurant-lookup/places";
import {
  clientIpFromRequest,
  lookupRateLimiter,
} from "@/lib/restaurant-lookup/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!hasGooglePlacesApiKey()) {
    return NextResponse.json(
      { error: "Restaurant lookup is not configured." },
      { status: 503 }
    );
  }

  const ip = clientIpFromRequest(req);
  const limit = lookupRateLimiter.check(`select:${ip}`);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many lookups. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const placeId = typeof body.place_id === "string" ? body.place_id.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const fallbackName = typeof body.name === "string" ? body.name.trim() : "Restaurant";
  if (!placeId) {
    return NextResponse.json({ error: "Select a restaurant listing." }, { status: 400 });
  }
  if (!city) {
    return NextResponse.json({ error: "City is required." }, { status: 400 });
  }

  try {
    const snapshot = await getRestaurantPlaceSnapshot(placeId, fallbackName);
    if (!snapshot) {
      return NextResponse.json({ error: "That listing could not be loaded." }, { status: 404 });
    }
    cachePlaceSnapshot(snapshot);

    const token = encodeLookupCookie({
      placeId: snapshot.place_id,
      name: snapshot.profile.name,
      city: snapshot.profile.city || city,
      address: snapshot.profile.address_line1,
      phone: snapshot.profile.phone,
      website: snapshot.profile.website,
    });
    if (!token) {
      return NextResponse.json(
        { error: "Could not save that restaurant. Try again." },
        { status: 500 }
      );
    }

    const res = NextResponse.json({
      lookup: {
        place_id: snapshot.place_id,
        name: snapshot.profile.name,
        address: [
          snapshot.profile.address_line1,
          snapshot.profile.city,
          snapshot.profile.region,
        ]
          .filter(Boolean)
          .join(", "),
        phone: snapshot.profile.phone,
        website: snapshot.profile.website,
        city: snapshot.profile.city || city,
        hours_found: Boolean(snapshot.weekly_hours),
        website_found: Boolean(snapshot.profile.website),
      },
    });
    res.cookies.set(LOOKUP_COOKIE_NAME, token, lookupCookieOptions());
    return res;
  } catch (err) {
    if (err instanceof EnvValidationError) {
      return NextResponse.json(
        { error: "Restaurant lookup is not configured." },
        { status: 503 }
      );
    }
    console.error("[restaurants lookup select]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Could not load that listing. Try another match." },
      { status: 502 }
    );
  }
}
