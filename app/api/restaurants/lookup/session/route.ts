import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  decodeLookupCookie,
  LOOKUP_COOKIE_NAME,
} from "@/lib/restaurant-lookup/cookie";

export const runtime = "nodejs";

export async function GET() {
  const token = cookies().get(LOOKUP_COOKIE_NAME)?.value ?? null;
  const payload = decodeLookupCookie(token);
  if (!payload) {
    return NextResponse.json({ lookup: null });
  }
  return NextResponse.json({
    lookup: {
      place_id: payload.placeId,
      name: payload.name,
      city: payload.city,
      address: payload.address,
      phone: payload.phone,
      website: payload.website,
    },
  });
}
