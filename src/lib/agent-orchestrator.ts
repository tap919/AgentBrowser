import { db } from '@/lib/db';
import { agentEventBus, type AgentEvent } from '@/lib/agent-event-bus';
import { securityMiddleware } from '@/lib/security-middleware';
import { agentScheduler } from '@/lib/agent-scheduler';
import { executeBusinessSkill } from '@/lib/business/bridge';
import { writeMemory, readMemory } from '@/lib/agent-memory';
import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import type { BusinessSkillId } from '@/lib/business/skills';

// ─── Types ───

export interface PipelineNode {
  id: string;
  type: 'agent' | 'business-skill' | 'memory-write' | 'memory-read';
  config: Record<string, unknown>;
  dependsOn?: string[];
  inputMap?: Record<string, string>;
}

export interface PipelineDefinition {
  nodes: PipelineNode[];
}

export interface PipelineRunResult {
  nodeId: string;
  status: 'success' | 'failed' | 'skipped';
  output: unknown;
  error?: string;
  durationMs: number;
}

// ─── Core Engine ───

function topoSort(nodes: PipelineNode[]): PipelineNode[] {
  const visited = new Set<string>();
  const sorted: PipelineNode[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  function visit(id: string, path: Set<string>): void {
    if (path.has(id)) throw new Error(`Circular dependency detected: ${id}`);
    if (visited.has(id)) return;
    path.add(id);
    const node = nodeMap.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    for (const dep of node.dependsOn || []) {
      visit(dep, path);
    }
    path.delete(id);
    visited.add(id);
    sorted.push(node);
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) visit(node.id, new Set());
  }

  return sorted;
}

function resolveInput(node: PipelineNode, nodeOutputs: Map<string, PipelineRunResult>): Record<string, unknown> {
  if (!node.inputMap) return { ...node.config };
  const resolved: Record<string, unknown> = {};
  for (const [key, expr] of Object.entries(node.inputMap)) {
    const match = expr.match(/^nodes\[([\w-]+)\]\.output\.(.+)$/);
    if (match) {
      const depOutput = nodeOutputs.get(match[1]);
      resolved[key] = depOutput ? getNested(depOutput.output, match[2]) : undefined;
    } else {
      resolved[key] = expr;
    }
  }
  return { ...node.config, ...resolved };
}

function getNested(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

async function executeNode(
  node: PipelineNode,
  resolvedInput: Record<string, unknown>,
): Promise<PipelineRunResult> {
  const start = Date.now();

  try {
    const securityResult = await securityMiddleware.validateAction(
      `pipeline:${node.type}:${node.id}`,
      { _tier: 'full', ...resolvedInput } as Record<string, unknown>,
    );

    if (!securityResult.approved) {
      return {
        nodeId: node.id,
        status: 'failed',
        output: null,
        error: `Security blocked: ${securityResult.blockedReasons.join(', ')}`,
        durationMs: Date.now() - start,
      };
    }

    let output: unknown;

    switch (node.type) {
      case 'agent': {
        const agentId = resolvedInput.agentId as string;
        if (!agentId) throw new Error('agentId required for agent node');
        output = await agentScheduler.executeAgent(agentId);
        break;
      }

      case 'business-skill': {
        const skill = resolvedInput.skill as BusinessSkillId;
        const action = resolvedInput.action as string;
        const params = resolvedInput.params as Record<string, unknown>;
        if (!skill || !action) throw new Error('skill and action required for business-skill node');
        output = await executeBusinessSkill({ skill, action, params: params || {} });
        break;
      }

      case 'memory-write': {
        await writeMemory({
          namespace: resolvedInput.namespace as string || 'pipeline',
          key: resolvedInput.key as string,
          value: resolvedInput.value,
          agentId: resolvedInput.agentId as string || 'orchestrator',
          ttl: resolvedInput.ttl as number | undefined,
        });
        output = { written: true };
        break;
      }

      case 'memory-read': {
        output = await readMemory(
          resolvedInput.key as string,
          resolvedInput.namespace as string,
        );
        break;
      }

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }

    return {
      nodeId: node.id,
      status: 'success',
      output,
      durationMs: Date.now() - start,
    };
  } catch (err: unknown) {
    return {
      nodeId: node.id,
      status: 'failed',
      output: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      durationMs: Date.now() - start,
    };
  }
}

// ─── Pipeline mutex (prevents concurrent runs of same pipeline) ───
const pipelineMutexes = new Map<string, Promise<void>>();
// ─── Pipeline cron job tracker (prevents duplicate schedules) ───
const pipelineCronJobs = new Map<string, ScheduledTask>();

// ─── Abort flags — force-delete signals a running pipeline to stop ───
const pipelineAbortFlags = new Map<string, boolean>();

function setAbortFlag(pipelineId: string): void {
  pipelineAbortFlags.set(pipelineId, true);
}

function checkAbortFlag(pipelineId: string): boolean {
  return pipelineAbortFlags.get(pipelineId) === true;
}

function clearAbortFlag(pipelineId: string): void {
  pipelineAbortFlags.delete(pipelineId);
}

async function withPipelineMutex<T>(pipelineId: string, fn: () => Promise<T>): Promise<T> {
  while (pipelineMutexes.has(pipelineId)) {
    await pipelineMutexes.get(pipelineId);
  }
  const promise = (async () => {
    try {
      return await fn();
    } finally {
      pipelineMutexes.delete(pipelineId);
    }
  })();
  pipelineMutexes.set(pipelineId, promise.then(() => {}) as Promise<void>);
  return promise;
}

// ─── Public API ───

export async function createPipeline(name: string, definition: PipelineDefinition, schedule?: string): Promise<{ id: string }> {
  const record = await db.agentPipeline.create({
    data: {
      name,
      definition: JSON.stringify(definition),
      schedule: schedule || null,
      enabled: true,
    },
  });
  return { id: record.id };
}

export async function runPipeline(pipelineId: string): Promise<PipelineRunResult[]> {
  return withPipelineMutex(pipelineId, async () => {
  const pipeline = await db.agentPipeline.findUnique({ where: { id: pipelineId } });
  if (!pipeline) throw new Error(`Pipeline not found: ${pipelineId}`);
  if (!pipeline.enabled) throw new Error(`Pipeline is disabled: ${pipelineId}`);

  const definition = JSON.parse(pipeline.definition) as PipelineDefinition;
  let sorted: PipelineNode[];
  try {
    sorted = topoSort(definition.nodes);
  } catch (dagErr) {
    console.warn(`[Orchestrator] DAG topoSort failed for ${pipeline.name}, falling back to sequential:`, dagErr);
    sorted = definition.nodes;
  }

  const run = await db.agentPipelineRun.create({
    data: {
      pipelineId: pipeline.id,
      status: 'running',
      startedAt: new Date(),
    },
  });

  agentEventBus.emit('pipeline:started', `pipeline:${pipelineId}`, { pipelineId, pipelineName: pipeline.name });

  const nodeOutputs = new Map<string, PipelineRunResult>();
  const results: PipelineRunResult[] = [];

  try {
    for (const node of sorted) {
      if (checkAbortFlag(pipelineId)) {
        clearAbortFlag(pipelineId);
        throw new Error('Pipeline aborted by force-delete');
      }
      const resolvedInput = resolveInput(node, nodeOutputs);
      const result = await executeNode(node, resolvedInput);
      nodeOutputs.set(node.id, result);
      results.push(result);
    }

    const failed = results.filter(r => r.status === 'failed');
    const status = failed.length === 0 ? 'completed' : 'completed_with_errors';

    await db.agentPipelineRun.update({
      where: { id: run.id },
      data: {
        status,
        results: JSON.stringify(results),
        completedAt: new Date(),
      },
    });

    if (failed.length === 0) {
      agentEventBus.emit('pipeline:completed', `pipeline:${pipelineId}`, {
        pipelineId, pipelineName: pipeline.name, results,
      });
    } else {
      agentEventBus.emit('pipeline:failed', `pipeline:${pipelineId}`, {
        pipelineId, pipelineName: pipeline.name, failedCount: failed.length, results,
      });
    }

    return results;
  } catch (err) {
    await db.agentPipelineRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        results: JSON.stringify(results),
        completedAt: new Date(),
      },
    });

    agentEventBus.emit('pipeline:failed', `pipeline:${pipelineId}`, {
      pipelineId, pipelineName: pipeline.name, error: err instanceof Error ? err.message : 'Unknown',
    });

    throw err;
  }
  });
}

export async function listPipelines(): Promise<Array<{ id: string; name: string; enabled: boolean; schedule: string | null; runCount: number }>> {
  const pipelines = await db.agentPipeline.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { runs: true } },
    },
  });
  return pipelines.map(p => ({
    id: p.id,
    name: p.name,
    enabled: p.enabled,
    schedule: p.schedule,
    runCount: p._count.runs,
  }));
}

export async function getPipelineStatus(pipelineId: string): Promise<{
  pipeline: { id: string; name: string; enabled: boolean; schedule: string | null };
  lastRun: { status: string; results: unknown; startedAt: string; completedAt: string | null } | null;
}> {
  const pipeline = await db.agentPipeline.findUnique({ where: { id: pipelineId } });
  if (!pipeline) throw new Error(`Pipeline not found: ${pipelineId}`);

  const lastRun = await db.agentPipelineRun.findFirst({
    where: { pipelineId },
    orderBy: { startedAt: 'desc' },
  });

  return {
    pipeline: { id: pipeline.id, name: pipeline.name, enabled: pipeline.enabled, schedule: pipeline.schedule },
    lastRun: lastRun ? {
      status: lastRun.status,
      results: lastRun.results ? JSON.parse(lastRun.results) : null,
      startedAt: lastRun.startedAt.toISOString(),
      completedAt: lastRun.completedAt?.toISOString() ?? null,
    } : null,
  };
}

export async function enablePipeline(pipelineId: string, enabled: boolean): Promise<void> {
  await db.agentPipeline.update({
    where: { id: pipelineId },
    data: { enabled },
  });
}

export async function deletePipeline(pipelineId: string, timeout = 30_000): Promise<void> {
  const job = pipelineCronJobs.get(pipelineId);
  if (job) {
    job.stop();
    pipelineCronJobs.delete(pipelineId);
  }
  await withPipelineMutex(pipelineId, async () => {
    await db.agentPipelineRun.deleteMany({ where: { pipelineId } });
    await db.agentPipeline.delete({ where: { id: pipelineId } });
  });
}

export async function forceDeletePipeline(pipelineId: string, timeout = 30_000): Promise<void> {
  const job = pipelineCronJobs.get(pipelineId);
  if (job) {
    job.stop();
    pipelineCronJobs.delete(pipelineId);
  }
  setAbortFlag(pipelineId);
  try {
    const start = Date.now();
    while (pipelineMutexes.has(pipelineId)) {
      if (Date.now() - start > timeout) break;
      await pipelineMutexes.get(pipelineId);
    }
  } finally {
    clearAbortFlag(pipelineId);
  }
  await db.agentPipelineRun.updateMany({
    where: { pipelineId, status: 'running' },
    data: { status: 'aborted', completedAt: new Date() },
  });
  await db.agentPipelineRun.deleteMany({ where: { pipelineId } });
  await db.agentPipeline.delete({ where: { id: pipelineId } });
}

export function shutdownOrchestrator(): void {
  pipelineCronJobs.forEach(job => job.stop());
  pipelineCronJobs.clear();
}

export async function schedulePipelines(): Promise<void> {
  // Stop existing pipeline cron jobs
  pipelineCronJobs.forEach(job => job.stop());
  pipelineCronJobs.clear();

  const pipelines = await db.agentPipeline.findMany({
    where: {
      enabled: true,
      schedule: { not: null },
    },
  });

  for (const pipeline of pipelines) {
    if (!pipeline.schedule) continue;
    try {
      const job = cron.schedule(pipeline.schedule, () => {
        runPipeline(pipeline.id).catch(err => {
          console.error(`[Orchestrator] Scheduled pipeline ${pipeline.name} failed:`, err);
        });
      });
      pipelineCronJobs.set(pipeline.id, job);
    } catch (err) {
      console.error(`[Orchestrator] Failed to schedule pipeline ${pipeline.name}:`, err);
    }
  }
}
