import { describe, it, expect } from 'vitest';
import { getWebBenchTasks, benchmarkSummary, type BenchmarkSuite } from '@/lib/benchmark-runner';

describe('benchmark-runner', () => {
  it('returns a task set with valid structure', () => {
    const tasks = getWebBenchTasks();
    expect(tasks.length).toBeGreaterThanOrEqual(3);
    for (const task of tasks) {
      expect(task.id).toBeTruthy();
      expect(task.name).toBeTruthy();
      expect(task.url).toMatch(/^https?:\/\//);
      expect(typeof task.successCriteria).toBe('function');
    }
  });

  it('benchmarkSummary handles empty suite', () => {
    const emptySuite: BenchmarkSuite = { name: 'Empty', tasks: [], results: [] };
    const summary = benchmarkSummary(emptySuite);
    expect(summary).toContain('Empty');
    expect(summary).toContain('0/0');
  });

  it('benchmarkSummary formats passed results', () => {
    const suite: BenchmarkSuite = {
      name: 'Test Suite',
      tasks: getWebBenchTasks().slice(0, 1),
      results: [
        { taskId: 'nav-1', status: 'pass', output: 'Example Domain', durationMs: 1500 },
      ],
    };
    const summary = benchmarkSummary(suite);
    expect(summary).toContain('✅');
    expect(summary).toContain('nav-1');
    expect(summary).toContain('1/1');
    expect(summary).toContain('100%');
  });

  it('benchmarkSummary formats mixed results', () => {
    const suite: BenchmarkSuite = {
      name: 'Mixed',
      tasks: getWebBenchTasks().slice(0, 3),
      results: [
        { taskId: 'nav-1', status: 'pass', output: 'ok', durationMs: 100 },
        { taskId: 'nav-2', status: 'fail', output: 'nope', durationMs: 200 },
        { taskId: 'form-1', status: 'error', output: '', durationMs: 50, error: 'timeout' },
      ],
    };
    const summary = benchmarkSummary(suite);
    expect(summary).toContain('✅');
    expect(summary).toContain('❌');
    expect(summary).toContain('⚠️');
    expect(summary).toContain('33%');
  });
});
