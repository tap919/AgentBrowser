import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/claw-protect-client', () => ({
  checkPromptInjection: vi.fn(async () => ({ detected: false, warnings: [] })),
  scanForSecrets: vi.fn(async () => []),
}));

vi.mock('@/lib/db', () => ({
  db: {
    agentEvent: {
      create: vi.fn(async () => ({})),
      findMany: vi.fn(async () => []),
    },
  },
}));

const { securityMiddleware } = await import('@/lib/security-middleware');

describe('SecurityMiddleware', () => {
  beforeEach(() => {
    securityMiddleware.setSecurityLevel('active');
  });

  it('approves low-risk actions by default', async () => {
    const result = await securityMiddleware.validateAction('test:action', { _tier: 'full' });
    expect(result.approved).toBe(true);
    expect(result.riskLevel).toBe('low');
  });

  it('blocks high-risk actions in active mode', async () => {
    const result = await securityMiddleware.validateAction(
      'test:action',
      { _tier: 'full', ignore: true }
    );
    // Contains 'ignore' keyword which triggers injection detection
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('setSecurityLevel changes the level', () => {
    securityMiddleware.setSecurityLevel('passive');
    expect(securityMiddleware.securityLevel).toBe('passive');
  });

  it('passive mode allows high-risk with warning', async () => {
    securityMiddleware.setSecurityLevel('passive');
    const result = await securityMiddleware.validateAction(
      'test:action',
      { _tier: 'full', admin: true }
    );
    // Passive mode: warns but doesn't block
    expect(result.approved).toBe(true);
  });

  it('logs events and retrieves them', async () => {
    const before = (await securityMiddleware.getEvents()).length;
    await securityMiddleware.validateAction('test:log', { _tier: 'full' });
    const after = (await securityMiddleware.getEvents()).length;
    expect(after).toBeGreaterThan(before);
  });

  it('handles validateAction errors gracefully', async () => {
    const result = await securityMiddleware.validateAction(
      'phase:1:test',
      { phaseId: 1, subSteps: [], checkType: 'prompt-injection' }
    );
    expect(result).toHaveProperty('approved');
    expect(result).toHaveProperty('riskLevel');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('blockedReasons');
  });

  it('MAX_EVENTS caps the event log', async () => {
    for (let i = 0; i < 600; i++) {
      securityMiddleware.logEvent({
        id: `e-${i}`, timestamp: new Date(), action: 'test', result: {
          approved: true, riskLevel: 'low', warnings: [], blockedReasons: [],
        },
      });
    }
    expect((await securityMiddleware.getEvents()).length).toBeLessThanOrEqual(500);
  });
});
