import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/credentials', () => ({
  getCredentials: vi.fn(async () => ({ githubToken: '' })),
}));

const { checkVibeServeHealth, callVibeServeTool, listVibeServeTools } = await import('./vibeserve-client');

describe('vibeserve-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkVibeServeHealth', () => {
    it('returns true when running', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
      expect(await checkVibeServeHealth()).toBe(true);
    });

    it('returns false when down', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Connection refused'));
      expect(await checkVibeServeHealth()).toBe(false);
    });
  });

  describe('callVibeServeTool', () => {
    it('returns result on direct success', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'tool output' }),
      } as Response);
      const result = await callVibeServeTool('vs_health', {});
      expect(result).toEqual({ success: true, result: { result: 'tool output' } });
    });

    it('returns error on 4xx without falling back', async () => {
      const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
      } as Response);
      const result = await callVibeServeTool('vs_unknown', {});
      expect(result).toEqual({ success: false, error: 'VibeServe returned 400' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('falls back to Mutly proxy on 5xx', async () => {
      vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: 'proxy result' }),
        } as Response);
      const result = await callVibeServeTool('vs_health', {});
      expect(result).toEqual({ success: true, result: 'proxy result' });
    });

    it('falls back to Mutly proxy on network error', async () => {
      vi.spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: 'proxy fallback' }),
        } as Response);
      const result = await callVibeServeTool('vs_health', {});
      expect(result).toEqual({ success: true, result: 'proxy fallback' });
    });

    it('returns error when both direct and proxy fail', async () => {
      vi.spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Direct down'))
        .mockRejectedValueOnce(new Error('Proxy down'));
      const result = await callVibeServeTool('vs_health', {});
      expect(result).toEqual({ success: false, error: expect.stringContaining('VibeServe direct and Mutly fallback both unreachable') });
    });

    it('returns error when Mutly proxy returns non-ok', async () => {
      vi.spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Direct down'))
        .mockResolvedValueOnce({ ok: false, status: 503 } as Response);
      const result = await callVibeServeTool('vs_health', {});
      expect(result).toEqual({ success: false, error: expect.stringContaining('Mutly responded with 503') });
    });

    it('returns error when Mutly proxy returns error in body', async () => {
      vi.spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Direct down'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: false, error: 'proxy error' }),
        } as Response);
      const result = await callVibeServeTool('vs_health', {});
      expect(result).toEqual({ success: false, error: 'proxy error' });
    });
  });

  describe('listVibeServeTools', () => {
    it('returns tools from direct call', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => (['tool1', 'tool2']),
      } as Response);
      const result = await listVibeServeTools();
      expect(result).toEqual({ success: true, tools: ['tool1', 'tool2'] });
    });

    it('handles response with tools wrapper', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ tools: ['a', 'b', 'c'] }),
      } as Response);
      const result = await listVibeServeTools();
      expect(result).toEqual({ success: true, tools: ['a', 'b', 'c'] });
    });

    it('falls back to Mutly proxy on direct failure', async () => {
      vi.spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Direct down'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: { availableTools: ['x', 'y'] } }),
        } as Response);
      const result = await listVibeServeTools();
      expect(result).toEqual({ success: true, tools: ['x', 'y'] });
    });

    it('returns error when both fail', async () => {
      vi.spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Direct down'))
        .mockRejectedValueOnce(new Error('Proxy down'));
      const result = await listVibeServeTools();
      expect(result).toEqual({ success: false, error: expect.stringContaining('VibeServe and Mutly fallback both unreachable') });
    });

    it('returns error when Mutly proxy returns non-ok', async () => {
      vi.spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Direct down'))
        .mockResolvedValueOnce({ ok: false, status: 503 } as Response);
      const result = await listVibeServeTools();
      expect(result).toEqual({ success: false, error: expect.stringContaining('VibeServe unreachable') });
    });
  });
});
