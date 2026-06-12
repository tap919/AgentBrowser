import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const agents = await db.agent.findMany({ orderBy: { addedAt: 'desc' } });
    return NextResponse.json(agents.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      type: a.type,
      config: a.config,
      code: a.code,
      securityTier: a.securityTier,
      enabled: a.enabled,
      addedAt: a.addedAt.toISOString(),
    })));
  } catch (err) {
    console.error('GET /api/agents error:', err);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }
    if (!body.type || !['config', 'code'].includes(body.type)) {
      return NextResponse.json({ error: 'Invalid type: must be "config" or "code"' }, { status: 400 });
    }

    const id = body.id || crypto.randomUUID();
    const configValue = body.type === 'config' && body.config ? body.config : undefined;
    const codeValue = body.type === 'code' && body.code ? body.code : undefined;

    const agent = await db.agent.upsert({
      where: { id },
      update: {
        name: body.name,
        description: body.description ?? null,
        type: body.type,
        config: configValue,
        code: codeValue ?? null,
        securityTier: body.securityTier || 'full',
        enabled: body.enabled ?? true,
      },
      create: {
        id,
        name: body.name,
        description: body.description ?? null,
        type: body.type,
        config: configValue,
        code: codeValue ?? null,
        securityTier: body.securityTier || 'full',
        enabled: body.enabled ?? true,
        addedAt: new Date(),
      },
    });
    return NextResponse.json(agent);
  } catch (err) {
    console.error('POST /api/agents error:', err);
    return NextResponse.json({ error: 'Failed to save agent' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const { updatedAt: _updatedAt, ...prismaData } = data;

    const agent = await db.agent.update({
      where: { id },
      data: prismaData,
    });
    return NextResponse.json(agent);
  } catch (err) {
    console.error('PUT /api/agents error:', err);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    await db.agent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/agents error:', err);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}