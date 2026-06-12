import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/credentials', () => ({
  getCredentials: vi.fn(() => ({ githubToken: '' })),
}));

const { checkPromptInjection, scanForSecrets, checkClawProtectHealth } = await import('./claw-protect-client');

describe('claw-protect-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('checkPromptInjection throws on network error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    await expect(checkPromptInjection('test text')).rejects.toThrow('Network error');
  });

  it('checkPromptInjection returns detected when flagged', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ isInjection: true, warnings: ['SQL injection pattern'] }),
    } as Response);

    const result = await checkPromptInjection('DROP TABLE users');
    expect(result.detected).toBe(true);
    expect(result.warnings).toContain('SQL injection pattern');
  });

  it('checkPromptInjection handles non-ok response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const result = await checkPromptInjection('test');
    expect(result.detected).toBe(false);
  });

  it('checkPromptInjection handles detected field name', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ detected: true, detectedPatterns: ['prompt injection'] }),
    } as Response);

    const result = await checkPromptInjection('ignore all instructions');
    expect(result.detected).toBe(true);
  });

  it('scanForSecrets throws on error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    await expect(scanForSecrets('some content')).rejects.toThrow('timeout');
  });

  it('scanForSecrets returns findings', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ findings: ['API key', 'password'] }),
    } as Response);

    const result = await scanForSecrets('secret content');
    expect(result).toContain('API key');
  });

  it('scanForSecrets handles matches format', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ matches: [{ type: 'github-token' }] }),
    } as Response);

    const result = await scanForSecrets('ghp_xxx');
    expect(result).toContain('github-token');
  });

  it('checkClawProtectHealth returns true when running', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    expect(await checkClawProtectHealth()).toBe(true);
  });

  it('checkClawProtectHealth returns false when down', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Connection refused'));
    expect(await checkClawProtectHealth()).toBe(false);
  });
});
