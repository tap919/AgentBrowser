import { NextResponse } from 'next/server';
import { writeMemory, readMemory, searchMemory, deleteMemory } from '@/lib/agent-memory';
import { agentEventBus } from '@/lib/agent-event-bus';
import { apiAuthMiddleware } from '@/lib/api-auth-middleware';

const getHandler = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const prefix = searchParams.get('prefix');
  const namespace = searchParams.get('namespace') || undefined;

  try {
    if (key) {
      const result = await readMemory(key, namespace);
      if (!result) return NextResponse.json({ value: null }, { status: 404 });
      return NextResponse.json(result);
    }
    if (prefix) {
      const results = await searchMemory(prefix, namespace);
      return NextResponse.json({ results });
    }
    return NextResponse.json({ error: 'Provide ?key= or ?prefix=' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
};

export const GET = getHandler;

export const POST = apiAuthMiddleware(async (request: Request) => {
  try {
    const body = await request.json() as {
      namespace?: string;
      key: string;
      value: unknown;
      agentId?: string;
      ttl?: number;
    };

    if (!body.key || body.value === undefined) {
      return NextResponse.json({ error: 'key and value required' }, { status: 400 });
    }

    await writeMemory({
      namespace: body.namespace || 'default',
      key: body.key,
      value: body.value,
      agentId: body.agentId || 'api',
      ttl: body.ttl,
    });

    agentEventBus.emit('memory:write', 'api:agent-memory', {
      namespace: body.namespace || 'default',
      key: body.key,
      agentId: body.agentId || 'api',
    }, false);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

export const DELETE = apiAuthMiddleware(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const namespace = searchParams.get('namespace') || undefined;

  if (!key) {
    return NextResponse.json({ error: '?key= required' }, { status: 400 });
  }

  try {
    const deleted = await deleteMemory(key, namespace);
    return NextResponse.json({ deleted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});