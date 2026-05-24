export type LogLevel = "debug" | "info" | "warn" | "error";

export type LoggerContext = {
  requestId?: string;
  component?: string;
  organizationId?: string;
  restaurantId?: string;
  userId?: string;
};

type LogFields = Record<string, unknown>;

const SENSITIVE_LOG_FIELD =
  /secret|password|token|api[_-]?key|authorization|bearer|cookie|service[_-]?role/i;

export function sanitizeLogFields(
  fields?: LogFields
): LogFields | undefined {
  if (!fields) return undefined;
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = SENSITIVE_LOG_FIELD.test(key) ? "[redacted]" : value;
  }
  return out;
}

function writeLog(
  level: LogLevel,
  message: string,
  ctx: LoggerContext,
  fields?: LogFields
): void {
  const safeFields = sanitizeLogFields(fields);
  const entry = {
    level,
    ts: new Date().toISOString(),
    msg: message,
    ...(ctx.requestId ? { request_id: ctx.requestId } : {}),
    ...(ctx.component ? { component: ctx.component } : {}),
    ...(ctx.organizationId ? { organization_id: ctx.organizationId } : {}),
    ...(ctx.restaurantId ? { restaurant_id: ctx.restaurantId } : {}),
    ...(ctx.userId ? { user_id: ctx.userId } : {}),
    ...safeFields,
  };

  const line = JSON.stringify(entry);
  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      if (process.env.NODE_ENV === "development") {
        console.debug(line);
      }
      break;
    default:
      console.log(line);
  }
}

export type Logger = {
  debug: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
  child: (extra: LoggerContext) => Logger;
};

export function createLogger(ctx: LoggerContext = {}): Logger {
  return {
    debug: (message, fields) => writeLog("debug", message, ctx, fields),
    info: (message, fields) => writeLog("info", message, ctx, fields),
    warn: (message, fields) => writeLog("warn", message, ctx, fields),
    error: (message, fields) => writeLog("error", message, ctx, fields),
    child: (extra) => createLogger({ ...ctx, ...extra }),
  };
}
