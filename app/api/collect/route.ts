import { NextResponse } from "next/server";
import { recordPageView } from "@/lib/analytics/site-stats";
import { isPixelPath } from "@/lib/meta-pixel";
import { clientIpFromRequest } from "@/lib/restaurant-lookup/rate-limit";

export const dynamic = "force-dynamic";

/** Netlify sends geo as base64 JSON in `x-nf-geo`; some setups also send `x-country`. */
function countryFrom(req: Request): string | null {
  const direct = req.headers.get("x-country")?.trim();
  if (direct) return direct.slice(0, 2);
  const geo = req.headers.get("x-nf-geo");
  if (!geo) return null;
  try {
    const parsed = JSON.parse(Buffer.from(geo, "base64").toString("utf8")) as { country?: { code?: string } };
    return parsed.country?.code?.slice(0, 2) ?? null;
  } catch {
    return null;
  }
}

function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

/** First-party page-view counter for the public site. No cookies; see lib/analytics/site-stats.ts. */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const path = str(body.p, 300);
  if (!path || !isPixelPath(path)) return new NextResponse(null, { status: 204 });

  let ownHost: string | null = null;
  try {
    ownHost = new URL(req.url).hostname;
  } catch {
    ownHost = null;
  }

  try {
    await recordPageView({
      path,
      referrer: str(body.r, 500),
      utmSource: str(body.us, 60),
      utmCampaign: str(body.uc, 80),
      userAgent: req.headers.get("user-agent") ?? "",
      ip: clientIpFromRequest(req),
      country: countryFrom(req),
      ownHost,
    });
  } catch {
    // Never surface stats failures to visitors.
  }
  return new NextResponse(null, { status: 204 });
}
