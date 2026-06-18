import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from '@/lib/security-middleware';
import { apiAuthMiddleware } from '@/lib/api-auth-middleware';

async function getHandler(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);
  const riskLevel = req.nextUrl.searchParams.get('riskLevel');
  const action = req.nextUrl.searchParams.get('action');

  let events = securityMiddleware.getEvents();
  if (riskLevel) {
    events = events.filter(e => e.result.riskLevel === riskLevel);
  }
  if (action) {
    events = events.filter(e => e.action.includes(action));
  }
  events = events.slice(0, Math.min(limit, 200));

  return NextResponse.json({
    events: events.map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      action: e.action,
      approved: e.result.approved,
      riskLevel: e.result.riskLevel,
      warnings: e.result.warnings,
      blockedReasons: e.result.blockedReasons,
    })),
    total: events.length,
  });
}

export const GET = apiAuthMiddleware(getHandler);
