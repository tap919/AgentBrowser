import { NextResponse } from 'next/server';
import { registerBuiltInWorkflows, listWorkflows, getWorkflow, runWorkflow, getWorkflowRun, listActiveRuns, listCategories } from '@/lib/workflow-engine';
import { apiAuthMiddleware } from '@/lib/api-auth-middleware';

// Ensure workflows are registered
registerBuiltInWorkflows();

export const GET = apiAuthMiddleware(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const runId = searchParams.get('runId');
  const category = searchParams.get('category');

  if (runId) {
    const run = getWorkflowRun(runId);
    if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    return NextResponse.json(run);
  }

  if (id) {
    const wf = getWorkflow(id);
    if (!wf) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    return NextResponse.json(wf);
  }

  return NextResponse.json({
    workflows: listWorkflows(category || undefined),
    categories: listCategories(),
    activeRuns: listActiveRuns().map(r => ({
      id: r.id, workflowId: r.workflowId, status: r.status, startedAt: r.startedAt,
    })),
  });
});

export const POST = apiAuthMiddleware(async (request: Request) => {
  try {
    const body = await request.json() as {
      action: 'trigger' | 'register';
      workflowId?: string;
      onStep?: string;
    };

    switch (body.action) {
      case 'trigger': {
        if (!body.workflowId) {
          return NextResponse.json({ error: 'workflowId required' }, { status: 400 });
        }
        const wf = getWorkflow(body.workflowId);
        if (!wf) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

        const run = await runWorkflow(body.workflowId);
        return NextResponse.json({ runId: run.id, workflowId: body.workflowId, status: run.status });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
