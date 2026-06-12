import { NextResponse } from 'next/server';

import { agentScheduler } from '@/lib/agent-scheduler';

export async function POST(request: Request) {
  let body: { id?: string };
  try {
    body = await request.json() as { id?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const log = await agentScheduler.triggerNow(body.id);
    return NextResponse.json({ log, agent: agentScheduler.getAgent(body.id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run agent' },
      { status: 500 },
    );
  }
}
