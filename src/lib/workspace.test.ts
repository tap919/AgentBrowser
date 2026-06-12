import { describe, it, expect, beforeEach, vi } from 'vitest';

const { PHASES_DEF, WORKSPACE_MODES, saveBuildState, loadBuildState, clearBuildState } = await import('./workspace');

describe('workspace modes', () => {
  it('has at least 6 workspace modes', () => {
    expect(WORKSPACE_MODES.length).toBeGreaterThanOrEqual(6);
    const ids = WORKSPACE_MODES.map(m => m.id);
    expect(ids).toContain('build');
    expect(ids).toContain('browse');
    expect(ids).toContain('security');
  });

  it('each mode has required fields', () => {
    for (const mode of WORKSPACE_MODES) {
      expect(mode).toHaveProperty('id');
      expect(mode).toHaveProperty('label');
      expect(mode).toHaveProperty('icon');
      expect(mode).toHaveProperty('description');
      expect(mode).toHaveProperty('color');
    }
  });
});

describe('PHASES_DEF', () => {
  it('has 12 phases', () => {
    expect(PHASES_DEF).toHaveLength(12);
    expect(PHASES_DEF[0].id).toBe(1);
    expect(PHASES_DEF[11].id).toBe(12);
  });

  it('each phase has required structure', () => {
    for (const phase of PHASES_DEF) {
      expect(phase).toHaveProperty('id');
      expect(phase).toHaveProperty('name');
      expect(phase).toHaveProperty('icon');
      expect(phase).toHaveProperty('type');
      expect(phase).toHaveProperty('subs');
      expect(Array.isArray(phase.subs)).toBe(true);
      expect(phase.subs.length).toBeGreaterThan(0);
    }
  });

  it('has audit phases', () => {
    const audits = PHASES_DEF.filter(p => p.type === 'audit');
    expect(audits.length).toBeGreaterThanOrEqual(2);
  });
});

describe('build state persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saveBuildState stores to localStorage', () => {
    const state = {
      savedAt: new Date().toISOString(),
      view: 'pipeline',
      phases: [],
      currentPhase: 0,
      currentSubStep: 0,
      confidence: 50,
      speed: 1,
      isPaused: false,
      pipelineRunning: true,
      techStack: [],
    };
    saveBuildState(state as any);
    expect(localStorage.getItem('ab_build_state')).toBeTruthy();
  });

  it('loadBuildState returns null when empty', () => {
    expect(loadBuildState()).toBeNull();
  });

  it('loadBuildState returns null for expired state', () => {
    const old = new Date(Date.now() - 90000000).toISOString(); // >24h
    localStorage.setItem('ab_build_state', JSON.stringify({ savedAt: old }));
    expect(loadBuildState()).toBeNull();
    expect(localStorage.getItem('ab_build_state')).toBeNull();
  });

  it('loadBuildState returns valid saved state', () => {
    const state = {
      savedAt: new Date().toISOString(),
      view: 'form',
      phases: [],
      currentPhase: -1,
      currentSubStep: 0,
      confidence: 0,
      speed: 1,
      isPaused: false,
      pipelineRunning: false,
      techStack: [],
    };
    saveBuildState(state);
    const loaded = loadBuildState();
    expect(loaded).not.toBeNull();
    expect(loaded!.view).toBe('form');
  });

  it('clearBuildState removes from localStorage', () => {
    saveBuildState({ savedAt: new Date().toISOString() } as any);
    clearBuildState();
    expect(localStorage.getItem('ab_build_state')).toBeNull();
  });

  it('handles corrupt data gracefully', () => {
    localStorage.setItem('ab_build_state', '{bad json');
    expect(loadBuildState()).toBeNull();
  });
});
