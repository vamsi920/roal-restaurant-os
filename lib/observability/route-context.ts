import { NextResponse } from "next/server";
import { createLogger, type Logger } from "@/lib/observability/logger";
import {
  getOrCreateRequestId,
  REQUEST_ID_HEADER,
} from "@/lib/observability/request-id";

export type RouteObservability = {
  requestId: string;
  log: Logger;
};

export function getRouteObservability(
  req: Request,
  component: string
): RouteObservability {
  const requestId = getOrCreateRequestId(req.headers);
  return {
    requestId,
    log: createLogger({ requestId, component }),
  };
}

export function jsonResponse(
  body: unknown,
  init: ResponseInit | undefined,
  requestId: string
): NextResponse {
  const res = NextResponse.json(body, init);
  res.headers.set(REQUEST_ID_HEADER, requestId);
  return res;
}
