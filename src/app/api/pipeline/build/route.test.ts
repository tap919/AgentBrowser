import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/build/executor/PipelineExecutor', () => {
  class MockRunner {
    async execute(phaseId: number) {
      return {
        phaseId, phaseName: 'Mock Phase', status: 'success' as const,
        output: 'mock', durationMs: 10,
        artifacts: [],
        metrics: { filesCreated: 1, linesOfCode: 10, testsPassing: 0, securityScore: 95 },
      };
    }
  }
  return {
    PipelineExecutor: vi.fn(),
    PHASES: [
      { id: 1, name: 'Mock Phase', runner: MockRunner },
      { id: 2, name: 'Mock Phase 2', runner: MockRunner },
    ],
  };
});

const { POST } = await import('./route');

describe('POST /api/pipeline/build', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 400 for missing name', async () => {
    const req = new Request('http://localhost/api/pipeline/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('name');
  });

  it('streams SSE events for valid request', async () => {
    const req = new Request('http://localhost/api/pipeline/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'TestApp', description: 'A test project', type: 'Web App', audience: 'Testers' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');

    const text = await res.text();
    expect(text).toContain('event: phase-start');
    expect(text).toContain('event: phase-complete');
    expect(text).toContain('event: pipeline-complete');
    expect(text).not.toContain('pipeline-error');
  });
});
