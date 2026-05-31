import { NextRequest, NextResponse } from "next/server";
import {
  generateRequestId,
  REQUEST_ID_HEADER,
} from "@/lib/observability/request-id";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const requestId =
    request.headers.get(REQUEST_ID_HEADER)?.trim() || generateRequestId();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const modifiedRequest = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
  });

  const response = await updateSession(modifiedRequest);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/reset-password",
    "/auth/callback",
    "/api/:path*",
  ],
};
