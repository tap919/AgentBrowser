import { describe, expect, it, vi, beforeEach } from 'vitest';

const VALID_TARGETS = new Set(['agentbrowser', 'research-content', 'core-platform', 'deployment-infra', 'security-compliance', 'data-analytics']);

const mockJobs: any[] = [];

vi.mock('@/lib/autonomous-store', () => ({
  ensureAutonomousSeedData: vi.fn(),
  listUpgradeJobs: vi.fn(() => [...mockJobs]),
  createUpgradeJob: vi.fn((targetId: string) => {
    if (!VALID_TARGETS.has(targetId)) return null;
    const existing = mockJobs.find(j => j.targetId === targetId && ['queued', 'awaiting_approval', 'running'].includes(j.status));
    if (existing) return { ...existing };
    const job = {
      requestId: `upgrade-${Date.now()}-${targetId}`,
      targetId,
      targetName: targetId,
      status: 'queued',
      createdAt: new Date().toISOString(),
      createdBy: 'test',
      summary: `Upgrade ${targetId}`,
      requestMessage: `Run upgrade for ${targetId}`,
      approvalTier: 'auto',
      approvalRequired: false,
      autoExecute: true,
      approvalRationale: 'Auto-approved for test',
      recommendedRepos: [],
    };
    mockJobs.push(job);
    return job;
  }),
  approveUpgradeJob: vi.fn((requestId: string) => {
    const job = mockJobs.find(j => j.requestId === requestId);
    if (!job) return null;
    job.status = 'queued';
    job.autoExecute = true;
    return { ...job };
  }),
  getAutonomousSettings: vi.fn(() => ({ enabled: false, policyLevel: 'manual' })),
}));

const { GET, POST } = await import('@/app/api/upgrade-sweep/route');

function req(body: unknown): Request {
  return new Request('http://localhost/api/upgrade-sweep', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockJobs.length = 0;
});

describe('GET /api/upgrade-sweep', () => {
  it('returns targets and empty queue on fresh start', async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.targets.length).toBeGreaterThanOrEqual(2);
    expect(data.queue).toEqual([]);
    expect(data.history).toEqual([]);
  });

  it('separates active vs history', async () => {
    mockJobs.push(
      { requestId: 'a', targetId: 'x', status: 'queued', createdAt: '2026-01-01' },
      { requestId: 'b', targetId: 'y', status: 'completed', createdAt: '2026-01-01' },
      { requestId: 'c', targetId: 'z', status: 'failed', createdAt: '2026-01-01' },
    );
    const data = await (await GET()).json();
    expect(data.queue).toHaveLength(1);
    expect(data.history).toHaveLength(2);
  });

  it('every target has an approval plan', async () => {
    const data = await (await GET()).json();
    for (const t of data.targets) {
      expect(['auto', 'review', 'manual']).toContain(t.approval.tier);
    }
  });
});

describe('POST launch', () => {
  it('rejects missing action', async () => {
    expect((await POST(req({}))).status).toBe(400);
  });

  it('rejects invalid action', async () => {
    expect((await POST(req({ action: 'destroy' }))).status).toBe(400);
  });

  it('rejects malformed JSON', async () => {
    const r = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad',
    });
    const res = await POST(r);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('Invalid JSON');
  });

  it('rejects missing targetId', async () => {
    expect((await POST(req({ action: 'launch' }))).status).toBe(400);
  });

  it('rejects unknown targetId', async () => {
    expect((await POST(req({ action: 'launch', targetId: 'bogus' }))).status).toBe(404);
  });

  it('creates queue entry for valid target', async () => {
    const data = await (await POST(req({ action: 'launch', targetId: 'agentbrowser' }))).json();
    expect(data.request.targetId).toBe('agentbrowser');
    expect(data.request.requestId).toMatch(/^upgrade-/);
  });

  it('deduplicates active requests', async () => {
    await POST(req({ action: 'launch', targetId: 'agentbrowser' }));
    const data = await (await POST(req({ action: 'launch', targetId: 'agentbrowser' }))).json();
    // Returns existing request with same targetId
    expect(data.request.targetId).toBe('agentbrowser');
    expect(data.deduped).toBe(false);
  });

  it('allows re-launch after completion', async () => {
    await POST(req({ action: 'launch', targetId: 'research-content' }));
    mockJobs[0].status = 'completed';
    const data = await (await POST(req({ action: 'launch', targetId: 'research-content' }))).json();
    expect(data.request.requestId).toMatch(/^upgrade-/);
  });
});

describe('POST approve', () => {
  it('rejects missing requestId', async () => {
    expect((await POST(req({ action: 'approve' }))).status).toBe(400);
  });

  it('rejects unknown requestId', async () => {
    expect((await POST(req({ action: 'approve', requestId: 'x' }))).status).toBe(404);
  });

  it('approves completed request (idempotent)', async () => {
    mockJobs.push({ requestId: 'r1', targetId: 'agentbrowser', status: 'completed', autoExecute: false });
    const data = await (await POST(req({ action: 'approve', requestId: 'r1' }))).json();
    expect(data.request.status).toBe('queued');
  });

  it('approves awaiting_approval request', async () => {
    mockJobs.push({ requestId: 'r2', targetId: 'agentbrowser', status: 'awaiting_approval', autoExecute: false });
    const data = await (await POST(req({ action: 'approve', requestId: 'r2' }))).json();
    expect(data.request.status).toBe('queued');
    expect(data.request.autoExecute).toBe(true);
  });
});
