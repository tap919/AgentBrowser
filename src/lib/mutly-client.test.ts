import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/credentials', () => ({
  getCredentials: vi.fn(async () => ({ githubToken: '' })),
}));

const { checkMutlyHealth, startPipeline, getPipelineStatus, getLatestPipelineStatus } = await import('./mutly-client');

describe('mutly-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkMutlyHealth', () => {
    it('returns true when running', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
      expect(await checkMutlyHealth()).toBe(true);
    });

    it('returns false when down', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Connection refused'));
      expect(await checkMutlyHealth()).toBe(false);
    });

    it('returns false on non-ok response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response);
      expect(await checkMutlyHealth()).toBe(false);
    });
  });

  describe('startPipeline', () => {
    it('returns pipelineId and status on success', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ pipelineId: 'abc-123', status: 'running' }),
      } as Response);
      const result = await startPipeline('/some/project');
      expect(result).toEqual({ pipelineId: 'abc-123', status: 'running' });
    });

    it('returns error on HTTP error', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal error' }),
      } as Response);
      const result = await startPipeline();
      expect(result).toHaveProperty('error');
    });

    it('returns error when Mutly unreachable', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network unreachable'));
      const result = await startPipeline();
      expect(result).toHaveProperty('error');
      expect((result as { error: string }).error).toContain('Mutly unreachable');
    });

    it('returns error when json body has no error field', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({}),
      } as Response);
      const result = await startPipeline();
      expect(result).toHaveProperty('error');
    });
  });

  describe('getPipelineStatus', () => {
    it('returns pipeline data on success', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, pipeline: { id: 'abc', status: 'completed' } }),
      } as Response);
      const result = await getPipelineStatus('abc');
      expect(result).toEqual({ success: true, pipeline: { id: 'abc', status: 'completed' } });
    });

    it('returns not found error on 404', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);
      const result = await getPipelineStatus('nonexistent');
      expect(result).toEqual({ error: 'Pipeline not found' });
    });

    it('returns error on other HTTP error', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 503,
      } as Response);
      const result = await getPipelineStatus('abc');
      expect(result).toHaveProperty('error');
    });

    it('returns error on network failure', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
      const result = await getPipelineStatus('abc');
      expect(result).toHaveProperty('error');
      expect((result as { error: string }).error).toContain('Mutly unreachable');
    });
  });

  describe('getLatestPipelineStatus', () => {
    it('returns status on success', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, pipeline: null, status: 'idle' }),
      } as Response);
      const result = await getLatestPipelineStatus();
      expect(result).toEqual({ success: true, pipeline: null, status: 'idle' });
    });

    it('returns error on HTTP error', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);
      const result = await getLatestPipelineStatus();
      expect(result).toHaveProperty('error');
    });

    it('returns error on network failure', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
      const result = await getLatestPipelineStatus();
      expect(result).toHaveProperty('error');
    });
  });
});
