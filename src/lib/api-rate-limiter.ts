import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Overlay 365 — API Rate Limiter (in-memory, per-instance)
 * For production, replace with Redis-backed rate limiting.
 */

const hits = new Map<string, { count: number; resetAt: number }>();

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? '127.0.0.1';
}

function rateLimit(
  key: string,
  windowMs: number,
  max: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  entry.count++;
  if (entry.count > max) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  return { allowed: true, retryAfterMs: 0 };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Rate limit middleware for Next.js API routes.
 * Apply in middleware.ts or per-route.
 */
export function apiRateLimit(
  req: NextRequest,
  opts: { windowMs?: number; max?: number } = {},
): NextResponse | null {
  const { windowMs = 60_000, max = 100 } = opts;
  const ip = getClientIP(req);
  const authKey = req.headers.get('x-agent-auth') ?? '';
  const key = authKey ? `${ip}:${authKey.slice(0, 8)}` : ip;

  const { allowed, retryAfterMs } = rateLimit(key, windowMs, max);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
      },
    );
  }

  return null;
}
