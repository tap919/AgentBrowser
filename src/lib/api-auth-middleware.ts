import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

const API_KEY = process.env.AGENT_API_KEY || '';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function apiAuthMiddleware(handler: Function) {
  return async (request: Request, ...args: any[]) => {
    const url = new URL(request.url);

    if (!API_KEY) {
      return NextResponse.json({ error: 'Service Unavailable: API key not configured' }, { status: 503 });
    }

    const providedKey = request.headers.get('X-Agent-Auth') || '';

    if (!providedKey || !safeCompare(providedKey, API_KEY)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handler(request, ...args);
  };
}
