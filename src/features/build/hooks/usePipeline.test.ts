import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the modules that usePipeline depends on
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(() => ({
    mode: 'dev',
    pipeline: { autoFix: true, skipAudit: false, defaultSpeed: 1 },
    security: { level: 'active' },
    integrations: [],
    customAgents: [],
  })),
  getEnabledIntegrations: vi.fn(() => []),
  getActiveAgents: vi.fn(() => []),
  saveSettings: vi.fn(),
}));

vi.mock('@/lib/security-middleware', () => ({
  securityMiddleware: {
    setSecurityLevel: vi.fn(),
    validateAction: vi.fn(async () => ({
      approved: true, riskLevel: 'low', warnings: [], blockedReasons: [],
    })),
  },
}));

vi.mock('@/lib/workspace', () => ({
  PHASES_DEF: [
    { id: 1, name: 'Research', icon: 'brain', type: 'build' as const, subs: ['Analyze'], securityCheck: 'prompt-injection' as const },
    { id: 2, name: 'Build', icon: 'box', type: 'build' as const, subs: ['Code'], securityCheck: 'command-validation' as const },
    { id: 11, name: 'Audit', icon: 'shield', type: 'audit' as const, subs: ['Security'], securityCheck: 'secrets-detection' as const },
  ],
  saveBuildState: vi.fn(),
  loadBuildState: vi.fn(() => null),
  clearBuildState: vi.fn(),
}));

vi.mock('@/lib/generate-site', () => ({
  generateSite: vi.fn(() => ({ html: '<html></html>' })),
}));

const { usePipeline } = await import('./usePipeline');

describe('usePipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initialState has correct defaults', () => {
    const { result } = renderHook(() => usePipeline());
    expect(result.current.state.view).toBe('form');
    expect(result.current.state.phases).toHaveLength(3);
    expect(result.current.state.pipelineRunning).toBe(false);
  });

  it('handlePauseResume toggles isPaused', () => {
    const { result } = renderHook(() => usePipeline());
    expect(result.current.state.isPaused).toBe(false);
    act(() => result.current.handlePauseResume());
    expect(result.current.state.isPaused).toBe(true);
    act(() => result.current.handlePauseResume());
    expect(result.current.state.isPaused).toBe(false);
  });

  it('handleSpeedChange updates speed', () => {
    const { result } = renderHook(() => usePipeline());
    act(() => result.current.handleSpeedChange(3));
    expect(result.current.state.speed).toBe(3);
  });

  it('handleNewProject resets to form view', () => {
    const { result } = renderHook(() => usePipeline());
    act(() => result.current.handleNewProject());
    expect(result.current.state.view).toBe('form');
    expect(result.current.state.project).toBeNull();
    expect(result.current.state.pipelineRunning).toBe(false);
  });

  it('handleRunAudit creates findings', () => {
    const { result } = renderHook(() => usePipeline());
    act(() => result.current.handleRunAudit());
    // Should have created findings for each category
    expect(result.current.state.findings.length).toBeGreaterThan(0);
  });

  it('initial phases have correct structure', () => {
    const { result } = renderHook(() => usePipeline());
    const phase = result.current.state.phases[0];
    expect(phase).toHaveProperty('id');
    expect(phase).toHaveProperty('name');
    expect(phase).toHaveProperty('status');
    expect(phase).toHaveProperty('progress');
    expect(phase).toHaveProperty('subSteps');
  });
});
