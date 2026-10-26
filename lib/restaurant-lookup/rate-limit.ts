export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
};

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  check(key: string, now = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs;
    const prior = this.hits.get(key) ?? [];
    const recent = prior.filter((t) => t > cutoff);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return { allowed: false, remaining: 0 };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true, remaining: this.limit - recent.length };
  }
}

export const lookupRateLimiter = new SlidingWindowRateLimiter(10, 10 * 60 * 1000);

export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  return real ? real.slice(0, 64) : "unknown";
}
