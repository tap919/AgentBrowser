import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/credentials', () => ({
  getCredentials: vi.fn(async () => ({ githubToken: '' })),
}));

const { checkReporankHealth, analyzeRepo, getScanStatus } = await import('./reporank-client');

describe('reporank-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkReporankHealth', () => {
    it('returns true when running', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
      expect(await checkReporankHealth()).toBe(true);
    });

    it('returns false when down', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Connection refused'));
      expect(await checkReporankHealth()).toBe(false);
    });

    it('returns false on non-ok response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);
      expect(await checkReporankHealth()).toBe(false);
    });
  });

  describe('analyzeRepo', () => {
    it('returns scanId and status on success', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ data: { scanId: 'scan-1', status: 'processing' } }),
      } as Response);
      const result = await analyzeRepo('https://github.com/user/repo');
      expect(result).toEqual({ scanId: 'scan-1', status: 'processing' });
    });

    it('handles response without data wrapper', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ scanId: 'scan-2', status: 'completed' }),
      } as Response);
      const result = await analyzeRepo('https://github.com/user/repo');
      expect(result).toEqual({ scanId: 'scan-2', status: 'completed' });
    });

    it('returns error on HTTP error', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ error: 'Invalid repo URL' }),
      } as Response);
      const result = await analyzeRepo('bad-url');
      expect(result).toHaveProperty('error');
    });

    it('returns error when RepoRank unreachable', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Connection refused'));
      const result = await analyzeRepo('https://github.com/user/repo');
      expect(result).toHaveProperty('error');
      expect((result as { error: string }).error).toContain('RepoRank unreachable');
    });

    it('accepts optional branch parameter', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ data: { scanId: 'scan-3', status: 'queued' } }),
      } as Response);
      const result = await analyzeRepo('https://github.com/user/repo', 'develop');
      expect(result).toEqual({ scanId: 'scan-3', status: 'queued' });
    });
  });

  describe('getScanStatus', () => {
    it('returns status and result on success', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: 'completed', result: { score: 85 } } }),
      } as Response);
      const result = await getScanStatus('scan-1');
      expect(result).toEqual({ status: 'completed', result: { score: 85 } });
    });

    it('handles response without data wrapper', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'failed', error: 'timeout' }),
      } as Response);
      const result = await getScanStatus('scan-2');
      expect(result).toEqual({ status: 'failed', result: { status: 'failed', error: 'timeout' } });
    });

    it('returns error on HTTP error', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);
      const result = await getScanStatus('nonexistent');
      expect(result).toHaveProperty('error');
    });

    it('returns error on network failure', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
      const result = await getScanStatus('scan-1');
      expect(result).toHaveProperty('error');
    });
  });
});
