import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { checkRateLimit, getClientKey } from '@/lib/api-rate-limit';

const API_KEY = process.env.AGENT_API_KEY || '';
const RATE_LIMIT_WINDOW_MS = Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? 60_000);
const RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX ?? 120);

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apiAuthMiddleware(handler: (request: any, ...args: any[]) => Promise<Response> | Response) {
  return async (request: Request, ...args: unknown[]) => {
    if (!API_KEY) {
      return NextResponse.json({ error: 'Service Unavailable: API key not configured' }, { status: 503 });
    }

    const providedKey = request.headers.get('X-Agent-Auth') || '';
    if (!providedKey || !safeCompare(providedKey, API_KEY)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateKey = `${getClientKey(request)}:${providedKey.slice(0, 8)}`;
    const rate = checkRateLimit(rateKey, {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX,
      keyPrefix: 'agent-api',
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) },
        },
      );
    }

    return handler(request, ...args);
  };
}
