import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getAgents, saveAgent, deleteAgent, toggleAgent, updateAgentTier } = await import('./agent-persistence');

describe('agent-persistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getAgents fetches from /api/agents', async () => {
    const mockResponse = [{ id: 'a1', name: 'Test Agent' }];
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const agents = await getAgents();
    expect(agents).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith('/api/agents', { cache: 'no-store' });
  });

  it('getAgents throws on error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    } as Response);

    await expect(getAgents()).rejects.toThrow('API error 500');
  });

  it('saveAgent posts to /api/agents', async () => {
    const agent = { id: 'a1', name: 'New Agent' };
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => agent,
    } as Response);

    const result = await saveAgent(agent as any);
    expect(result).toEqual(agent);
    expect(fetch).toHaveBeenCalledWith('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent),
    });
  });

  it('deleteAgent sends DELETE', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    await deleteAgent('a1');
    expect(fetch).toHaveBeenCalledWith('/api/agents?id=a1', { method: 'DELETE' });
  });

  it('deleteAgent throws on error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Not found',
    } as Response);
    await expect(deleteAgent('x')).rejects.toThrow('API error 404');
  });

  it('toggleAgent sends PUT with enabled', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    await toggleAgent('a1', false);
    expect(fetch).toHaveBeenCalledWith('/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'a1', enabled: false }),
    });
  });

  it('updateAgentTier sends PUT with securityTier', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    await updateAgentTier('a1', 'reduced');
    expect(fetch).toHaveBeenCalledWith('/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'a1', securityTier: 'reduced' }),
    });
  });
});
