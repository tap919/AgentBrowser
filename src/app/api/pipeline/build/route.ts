import { NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { PipelineExecutor, PHASES } from '@/features/build/executor/PipelineExecutor';
import type { PhaseInput } from '@/features/build/executor/PhaseRunner';

interface BuildRequest {
  name: string;
  description: string;
  type: string;
  audience: string;
  techStack?: string[];
}

export async function POST(request: Request) {
  let body: BuildRequest;
  try {
    body = await request.json() as BuildRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
  }

  const workspaceDir = path.join(os.tmpdir(), 'agentbrowser-builds', Date.now().toString());
  fs.mkdirSync(workspaceDir, { recursive: true });

  const input: PhaseInput = {
    name: body.name,
    description: body.description || '',
    type: body.type || 'Web Application',
    audience: body.audience || 'General users',
    techStack: body.techStack,
  };

  let isStreaming = true;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (!isStreaming) return;
        try {
          controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      try {
        const executor = new PipelineExecutor(workspaceDir);
        const results: Awaited<ReturnType<typeof executor.executeAll>> = [];

        for (const phaseDef of PHASES) {
          if (!isStreaming) break;

          send('phase-start', { phaseId: phaseDef.id, phaseName: phaseDef.name });

          const runner = new phaseDef.runner(workspaceDir);
          const result = await runner.execute(
            phaseDef.id,
            input,
            undefined,
            (subStep, totalSteps, message) => {
              const progress = totalSteps > 0 ? Math.round((subStep / totalSteps) * 100) : 0;
              send('phase-progress', {
                phaseId: phaseDef.id,
                progress,
                subStep,
                totalSteps,
                message,
              });
            }
          );

          results.push(result);
          send('phase-complete', {
            phaseId: phaseDef.id,
            phaseName: phaseDef.name,
            result: {
              status: result.status,
              output: result.output,
              durationMs: result.durationMs,
              artifacts: result.artifacts,
              metrics: result.metrics,
            },
          });
        }

        // Aggregate metrics across all phases
        const totalMetrics = results.reduce(
          (acc, r) => ({
            linesOfCode: (acc.linesOfCode || 0) + (r.metrics?.linesOfCode || 0),
            filesCreated: (acc.filesCreated || 0) + (r.metrics?.filesCreated || 0),
            testsPassing: (acc.testsPassing || 0) + (r.metrics?.testsPassing || 0),
            securityScore: Math.max(acc.securityScore || 0, r.metrics?.securityScore || 0),
          }),
          {} as Record<string, number>
        );

        send('pipeline-complete', {
          results,
          workspaceDir,
          metrics: totalMetrics,
        });
      } catch (err) {
        send('pipeline-error', { error: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        isStreaming = false;
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
