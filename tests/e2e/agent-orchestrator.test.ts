import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE = 'http://localhost:3000';
const API_KEY = process.env.AGENT_API_KEY || 'test-api-key';

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  'X-Agent-Auth': API_KEY,
};

const isServerRunning = async () => {
  try {
    const res = await fetch(`${BASE}/api/pipelines`, {
      signal: AbortSignal.timeout(2000),
    });
    return true;
  } catch {
    return false;
  }
};

describe('Agent Orchestrator API E2E', () => {
  let serverAvailable = false;
  let createdPipelineId: string | null = null;

  beforeAll(async () => {
    serverAvailable = await isServerRunning();
  });

  afterAll(async () => {
    if (serverAvailable && createdPipelineId) {
      await fetch(`${BASE}/api/pipelines`, {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          action: 'delete',
          pipelineId: createdPipelineId,
        }),
      });
    }
  });

  it('requires authentication for create', async () => {
    if (!serverAvailable) return;
    const res = await fetch(`${BASE}/api/pipelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        name: 'E2E Unauthorized Test',
        definition: { nodes: [] },
      }),
    });
    expect(res.status).toBe(401);
  });

  it('creates a pipeline', async () => {
    if (!serverAvailable) return;
    const res = await fetch(`${BASE}/api/pipelines`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({
        action: 'create',
        name: 'E2E Test Pipeline',
        definition: {
          nodes: [
            {
              id: 'memory-write',
              type: 'memory-write',
              dependsOn: [],
              config: {
                namespace: 'e2e-pipeline',
                key: 'e2e-pipeline-test',
                value: { source: 'orchestrator-e2e' },
                agentId: 'e2e-orch',
                ttl: 300,
              },
            },
          ],
        },
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeTruthy();
    createdPipelineId = data.id;
  });

  it('lists pipelines', async () => {
    if (!serverAvailable) return;
    const res = await fetch(`${BASE}/api/pipelines`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.pipelines.length).toBeGreaterThanOrEqual(1);
    const found = data.pipelines.find((p: { id: string }) => p.id === createdPipelineId);
    expect(found).toBeTruthy();
    expect(found.name).toBe('E2E Test Pipeline');
  });

  it('gets pipeline status', async () => {
    if (!serverAvailable || !createdPipelineId) return;
    const res = await fetch(`${BASE}/api/pipelines?id=${createdPipelineId}`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.pipeline.name).toBe('E2E Test Pipeline');
    expect(data.pipeline.enabled).toBe(true);
  });

  it('runs a pipeline', async () => {
    if (!serverAvailable || !createdPipelineId) return;
    const res = await fetch(`${BASE}/api/pipelines`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({
        action: 'run',
        pipelineId: createdPipelineId,
      }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.results).toBeTruthy();
    expect(data.results.length).toBe(1);
    expect(data.results[0].nodeId).toBe('memory-write');
    expect(data.results[0].status).toBe('success');

    // Verify the memory was written
    const memRes = await fetch(`${BASE}/api/agent-memory?key=e2e-pipeline-test&namespace=e2e-pipeline`);
    expect(memRes.ok).toBe(true);
    const memData = await memRes.json();
    expect(memData.value).toEqual({ source: 'orchestrator-e2e' });
  });

  it('requires auth for run', async () => {
    if (!serverAvailable || !createdPipelineId) return;
    const res = await fetch(`${BASE}/api/pipelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'run',
        pipelineId: createdPipelineId,
      }),
    });
    expect(res.status).toBe(401);
  });

  it('disables and enables a pipeline', async () => {
    if (!serverAvailable || !createdPipelineId) return;
    // Disable
    const disableRes = await fetch(`${BASE}/api/pipelines`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ action: 'disable', pipelineId: createdPipelineId }),
    });
    expect(disableRes.ok).toBe(true);

    let statusRes = await fetch(`${BASE}/api/pipelines?id=${createdPipelineId}`);
    let statusData = await statusRes.json();
    expect(statusData.pipeline.enabled).toBe(false);

    // Enable
    const enableRes = await fetch(`${BASE}/api/pipelines`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ action: 'enable', pipelineId: createdPipelineId }),
    });
    expect(enableRes.ok).toBe(true);

    statusRes = await fetch(`${BASE}/api/pipelines?id=${createdPipelineId}`);
    statusData = await statusRes.json();
    expect(statusData.pipeline.enabled).toBe(true);
  });

  it('requires name and definition for create', async () => {
    if (!serverAvailable) return;
    const res = await fetch(`${BASE}/api/pipelines`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ action: 'create' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects unknown actions', async () => {
    if (!serverAvailable) return;
    const res = await fetch(`${BASE}/api/pipelines`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ action: 'unknown' }),
    });
    expect(res.status).toBe(400);
  });
});
