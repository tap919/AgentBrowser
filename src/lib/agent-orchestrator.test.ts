import { describe, it, expect } from 'vitest';
import { createPipeline, listPipelines, deletePipeline, enablePipeline, getPipelineStatus, type PipelineDefinition } from '@/lib/agent-orchestrator';

const testPipeline: PipelineDefinition = {
  nodes: [
    { id: 'memory-read-test', type: 'memory-read', dependsOn: [], config: { key: 'test-orch', namespace: 'test-orch' }, inputMap: {} },
    { id: 'memory-write-test', type: 'memory-write', dependsOn: [], config: { namespace: 'test-orch', key: 'test-orch', value: { orchestrated: true }, agentId: 'orch-test' }, inputMap: {} },
  ],
};

describe('agent-orchestrator', () => {
  let pipelineId: string;

  it('creates a pipeline', async () => {
    const result = await createPipeline('Test Pipeline', testPipeline);
    expect(result.id).toBeTruthy();
    pipelineId = result.id;
  });

  it('lists pipelines', async () => {
    const pipelines = await listPipelines();
    expect(pipelines.length).toBeGreaterThanOrEqual(1);
    const found = pipelines.find(p => p.name === 'Test Pipeline');
    expect(found).toBeDefined();
    expect(found!.enabled).toBe(true);
  });

  it('gets pipeline status', async () => {
    const status = await getPipelineStatus(pipelineId);
    expect(status.pipeline.name).toBe('Test Pipeline');
    expect(status.pipeline.enabled).toBe(true);
  });

  it('enables/disables pipeline', async () => {
    await enablePipeline(pipelineId, false);
    const status = await getPipelineStatus(pipelineId);
    expect(status.pipeline.enabled).toBe(false);

    await enablePipeline(pipelineId, true);
    const status2 = await getPipelineStatus(pipelineId);
    expect(status2.pipeline.enabled).toBe(true);
  });

  it('deletes a pipeline', async () => {
    const id = (await createPipeline('Delete Me', testPipeline)).id;
    await deletePipeline(id);
    const pipelines = await listPipelines();
    const found = pipelines.find(p => p.id === id);
    expect(found).toBeUndefined();
  });
});
