import { NextResponse } from 'next/server';
import { sessions } from '../route';

export async function POST(req: Request) {
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
