import { NextResponse } from 'next/server';
import { createPipeline, runPipeline, listPipelines, getPipelineStatus, enablePipeline, deletePipeline, type PipelineDefinition } from '@/lib/agent-orchestrator';
import { apiAuthMiddleware } from '@/lib/api-auth-middleware';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pipelineId = searchParams.get('id');

  if (pipelineId) {
    try {
      const status = await getPipelineStatus(pipelineId);
      return NextResponse.json(status);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: msg }, { status: 404 });
    }
  }

  try {
    const pipelines = await listPipelines();
    return NextResponse.json({ pipelines });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const POST = apiAuthMiddleware(async (request: Request) => {
  try {
    const body = await request.json() as {
      action: 'create' | 'run' | 'enable' | 'disable' | 'delete';
      name?: string;
      definition?: PipelineDefinition;
      schedule?: string;
      pipelineId?: string;
    };

    switch (body.action) {
      case 'create': {
        if (!body.name || !body.definition) {
          return NextResponse.json({ error: 'name and definition required' }, { status: 400 });
        }
        const result = await createPipeline(body.name, body.definition, body.schedule);
        return NextResponse.json(result, { status: 201 });
      }

      case 'run': {
        if (!body.pipelineId) {
          return NextResponse.json({ error: 'pipelineId required' }, { status: 400 });
        }
        const results = await runPipeline(body.pipelineId);
        return NextResponse.json({ results });
      }

      case 'enable':
      case 'disable': {
        if (!body.pipelineId) {
          return NextResponse.json({ error: 'pipelineId required' }, { status: 400 });
        }
        await enablePipeline(body.pipelineId, body.action === 'enable');
        return NextResponse.json({ success: true });
      }

      case 'delete': {
        if (!body.pipelineId) {
          return NextResponse.json({ error: 'pipelineId required' }, { status: 400 });
        }
        await deletePipeline(body.pipelineId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});