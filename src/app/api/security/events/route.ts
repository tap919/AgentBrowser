import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from '@/lib/security-middleware';
import { apiAuthMiddleware } from '@/lib/api-auth-middleware';
import { checkRateLimit, getClientKey } from '@/lib/api-rate-limit';

async function getHandler(req: NextRequest) {
  const clientKey = getClientKey(req);
  const rate = checkRateLimit(clientKey, {
    windowMs: 60_000,
    maxRequests: 30,
    keyPrefix: 'security-events',
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    );
  }

  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('limit') || '50', 10), 1), 100);
  const cursor = req.nextUrl.searchParams.get('cursor');
  const riskLevel = req.nextUrl.searchParams.get('riskLevel');
  const action = req.nextUrl.searchParams.get('action');

  let events = await securityMiddleware.getEvents({ limit: 500 });
  if (riskLevel) {
    events = events.filter(e => e.result.riskLevel === riskLevel);
  }
  if (action) {
    events = events.filter(e => e.action.includes(action));
  }

  const total = events.length;
  let startIndex = 0;
  if (cursor) {
    const cursorIndex = events.findIndex(e => e.id === cursor);
    startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  }
  const page = events.slice(startIndex, startIndex + limit);
  const nextCursor = page.length === limit && startIndex + limit < total
    ? page[page.length - 1]?.id
    : null;

  return NextResponse.json({
    events: page.map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      action: e.action,
      approved: e.result.approved,
      riskLevel: e.result.riskLevel,
      warnings: e.result.warnings,
      blockedReasons: e.result.blockedReasons,
    })),
    total,
    limit,
    cursor: cursor ?? null,
    nextCursor,
    hasMore: nextCursor !== null,
  });
}

export const GET = apiAuthMiddleware(getHandler);
