/**
 * In-memory per-client rate limiting for API routes.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
}

export function checkRateLimit(
  clientKey: string,
  options: RateLimitOptions = {},
): { allowed: boolean; retryAfterMs: number; remaining: number } {
  const windowMs = options.windowMs ?? 60_000;
  const maxRequests = options.maxRequests ?? 60;
  const key = `${options.keyPrefix ?? 'api'}:${clientKey}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const allowed = bucket.count <= maxRequests;
  return {
    allowed,
    retryAfterMs: Math.max(0, bucket.resetAt - now),
    remaining: Math.max(0, maxRequests - bucket.count),
  };
}

export function getClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'local';
}
