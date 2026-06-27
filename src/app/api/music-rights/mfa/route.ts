import { NextResponse } from 'next/server';
import { apiAuthMiddleware } from '@/lib/api-auth-middleware';
import { sessions } from '../route';

async function handler(req: Request) {
  try {
    const { sessionId, code } = await req.json();

    if (!sessionId || !code) {
      return NextResponse.json({ error: 'sessionId and code are required' }, { status: 400 });
    }

    const session = sessions.get(sessionId);
    if (!session || !session.resolveMfa) {
      return NextResponse.json({ error: 'Verification session expired or invalid' }, { status: 404 });
    }

    // Resolve the promise waiting in route.ts, passing the code
    session.resolveMfa(code);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

export const POST = apiAuthMiddleware(handler);
