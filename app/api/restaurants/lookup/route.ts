import { NextResponse } from "next/server";
import { EnvValidationError } from "@/lib/env.shared";
import { hasGooglePlacesApiKey } from "@/lib/env.server";
import { parseLookupInput } from "@/lib/restaurant-lookup/input";
import { searchRestaurantPlaces } from "@/lib/restaurant-lookup/places";
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
  const limit = lookupRateLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many lookups. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parseLookupInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const places = await searchRestaurantPlaces(parsed.name, parsed.city);
    return NextResponse.json({ places, city: parsed.city });
  } catch (err) {
    if (err instanceof EnvValidationError) {
      return NextResponse.json(
        { error: "Restaurant lookup is not configured." },
        { status: 503 }
      );
    }
    console.error("[restaurants lookup]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Could not find that restaurant. Try a more specific name and city." },
      { status: 502 }
    );
  }
}
