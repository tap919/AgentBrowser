import { NextResponse } from 'next/server';
import { apiAuthMiddleware } from '@/lib/api-auth-middleware';
import { SERVICES, checkAllServices, checkServiceHealth, preBuildAudit, runMutlyPipeline, getMutlyPipelineStatus, getVibeServeTools, executeVibeServeTool, rankProject, createRepoBrief, listRepoBriefs, getRepoBrief, createRepoMilestone, listRepoMilestones, evaluateRepoGate, runRepoDrift, getFullScanResult } from '@/lib/service-hub';

export async function GET() {
  const statuses = await checkAllServices();
  return NextResponse.json({
    services: SERVICES.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      port: s.port,
      status: s.status,
      capabilities: s.capabilities,
    })),
    health: statuses,
  });
}

export const POST = apiAuthMiddleware(async (request: Request) => {
  try {
    const body = await request.json() as {
      action: string;
      serviceId?: string;
      projectName?: string;
      projectPath?: string;
      tool?: string;
      params?: Record<string, unknown>;
    };

    switch (body.action) {
      case 'check': {
        if (body.serviceId) {
          const svc = SERVICES.find(s => s.id === body.serviceId);
          if (!svc) return NextResponse.json({ error: 'Unknown service' }, { status: 404 });
          const status = await checkServiceHealth(svc);
          return NextResponse.json(status);
        }
        const all = await checkAllServices();
        return NextResponse.json({ health: all });
      }

      case 'prebuild-audit': {
        if (!body.projectName || !body.projectPath) {
          return NextResponse.json({ error: 'projectName and projectPath required' }, { status: 400 });
        }
        const result = await preBuildAudit(body.projectName, body.projectPath);
        return NextResponse.json(result);
      }

      case 'mutly-run-pipeline': {
        const result = await runMutlyPipeline(body.projectPath);
        return NextResponse.json({ result });
      }

      case 'mutly-status': {
        const status = await getMutlyPipelineStatus();
        return NextResponse.json({ status });
      }

      case 'vibeserve-tools': {
        const tools = await getVibeServeTools();
        return NextResponse.json({ tools });
      }

      case 'vibeserve-execute': {
        if (!body.tool) return NextResponse.json({ error: 'tool required' }, { status: 400 });
        const result = await executeVibeServeTool(body.tool, body.params || {});
        return NextResponse.json({ result });
      }

      case 'reporank-rank': {
        if (!body.projectPath) return NextResponse.json({ error: 'projectPath required' }, { status: 400 });
        const result = await rankProject(body.projectPath);
        return NextResponse.json({ result });
      }

      case 'reporank-create-brief': {
        const result = await createRepoBrief((body.params || {}) as Record<string, unknown>);
        return NextResponse.json({ result });
      }

      case 'reporank-list-briefs': {
        const result = await listRepoBriefs();
        return NextResponse.json({ result });
      }

      case 'reporank-get-brief': {
        if (!body.serviceId) return NextResponse.json({ error: 'briefId required as serviceId' }, { status: 400 });
        const result = await getRepoBrief(body.serviceId);
        return NextResponse.json({ result });
      }

      case 'reporank-create-milestone': {
        const result = await createRepoMilestone((body.params || {}) as Record<string, unknown>);
        return NextResponse.json({ result });
      }

      case 'reporank-list-milestones': {
        if (!body.serviceId) return NextResponse.json({ error: 'projectId required as serviceId' }, { status: 400 });
        const result = await listRepoMilestones(body.serviceId);
        return NextResponse.json({ result });
      }

      case 'reporank-evaluate-gate': {
        if (!body.serviceId) return NextResponse.json({ error: 'gateId required as serviceId' }, { status: 400 });
        const result = await evaluateRepoGate(body.serviceId, (body.params || {}) as Record<string, unknown>);
        return NextResponse.json({ result });
      }

      case 'reporank-run-drift': {
        if (!body.serviceId) return NextResponse.json({ error: 'projectId required as serviceId' }, { status: 400 });
        const result = await runRepoDrift(body.serviceId, (body.params || {}) as Record<string, unknown>);
        return NextResponse.json({ result });
      }

      case 'reporank-get-scan': {
        if (!body.serviceId) return NextResponse.json({ error: 'scanId required as serviceId' }, { status: 400 });
        const result = await getFullScanResult(body.serviceId);
        return NextResponse.json({ result });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
