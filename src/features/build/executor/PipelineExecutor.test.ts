import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipelineExecutor, PHASES } from './PipelineExecutor';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { mkdtempSync } from 'node:fs';

const TEST_INPUT = {
  name: 'TestApp',
  description: 'A full pipeline test application',
  type: 'Web App',
  audience: 'Developers',
};

describe('PipelineExecutor', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync('ab-test-');
  });

  it('constructs with workspace directory', () => {
    const executor = new PipelineExecutor(tmpDir);
    expect(executor.activePhase).toBeNull();
  });

  it('has 12 phases defined', () => {
    expect(PHASES).toHaveLength(12);
    expect(PHASES[0].id).toBe(1);
    expect(PHASES[11].id).toBe(12);
  });

  it('executes a single phase', async () => {
    const executor = new PipelineExecutor(tmpDir);
    const result = await executor.executePhase(1, TEST_INPUT);
    expect(result.status).toBe('success');
    expect(result.artifacts).toBeDefined();
    expect(result.artifacts!.length).toBeGreaterThan(0);
  });

  it('executes all 12 phases in order', { timeout: 30000 }, async () => {
    const executor = new PipelineExecutor(tmpDir);
    const onProgress = vi.fn();
    const results = await executor.executeAll(TEST_INPUT, onProgress);

    expect(results).toHaveLength(12);
    for (const r of results) {
      expect(r.status).toBe('success');
    }
    expect(onProgress).toHaveBeenCalled();
  });

  it('aborts mid-execution', async () => {
    const executor = new PipelineExecutor(tmpDir);
    const promise = executor.executeAll(TEST_INPUT);
    executor.abort();
    const results = await promise;
    expect(results.length).toBeLessThanOrEqual(12);
  });

  it('rejects parallel execution', async () => {
    const executor = new PipelineExecutor(tmpDir);
    executor.executeAll(TEST_INPUT);
    await expect(executor.executeAll(TEST_INPUT)).rejects.toThrow('already running');
  });

  it('Phase 4 creates real project files on disk', { timeout: 30000 }, async () => {
    const executor = new PipelineExecutor(tmpDir);
    await executor.executePhase(4, TEST_INPUT);
    const projectDir = path.join(tmpDir, 'TestApp');
    expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.gitignore'))).toBe(true);
  });

  it('full pipeline creates real source files', { timeout: 30000 }, async () => {
    const executor = new PipelineExecutor(tmpDir);
    await executor.executeAll(TEST_INPUT);
    const projectDir = path.join(tmpDir, 'TestApp');

    // Files from Phase 6 (Core Features)
    expect(fs.existsSync(path.join(projectDir, 'src', 'app', 'page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'src', 'app', 'api', 'health', 'route.ts'))).toBe(true);

    // Files from Phase 9 (Features)
    expect(fs.existsSync(path.join(projectDir, 'src', 'app', 'error.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'src', 'app', 'loading.tsx'))).toBe(true);

    // Reports from Phase 7, 11
    expect(fs.existsSync(path.join(projectDir, 'audit-report.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'full-audit-report.json'))).toBe(true);

    // Deploy docs from Phase 12
    expect(fs.existsSync(path.join(projectDir, 'vercel.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'DEPLOYMENT_SUMMARY.md'))).toBe(true);
  });

  it('handles unknown phase gracefully', async () => {
    const executor = new PipelineExecutor(tmpDir);
    await expect(executor.executePhase(99, TEST_INPUT)).rejects.toThrow('Unknown phase');
  });

  it('every phase runner produces a PhaseResult with correct shape', { timeout: 30000 }, async () => {
    const executor = new PipelineExecutor(tmpDir);
    for (const phase of PHASES) {
      const result = await executor.executePhase(phase.id, TEST_INPUT);
      expect(result).toHaveProperty('phaseId', phase.id);
      expect(result).toHaveProperty('phaseName');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('durationMs');
      expect(['success', 'failed', 'aborted']).toContain(result.status);
    }
  });
});
