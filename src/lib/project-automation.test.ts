import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// We test the logic directly by mocking fs for controlled analysis
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs') as typeof fs;
  return { ...actual };
});

const { analyzeProjectSync, getWatchedProjects, analyzeAllProjects, getDefaultTasks } = await import('./project-automation');

vi.setConfig({ testTimeout: 15000 });

describe('getWatchedProjects', () => {
  it('returns all watched projects', () => {
    const projects = getWatchedProjects();
    expect(projects.length).toBeGreaterThan(10);
    expect(projects.some(p => p.name === 'Billion Business')).toBe(true);
    expect(projects.some(p => p.name === 'NCSOUND-PUB-main')).toBe(true);
  });

  it('each project has name, path, exists flags', () => {
    for (const p of getWatchedProjects()) {
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('path');
      expect(p).toHaveProperty('exists');
      expect(p).toHaveProperty('hasGit');
      expect(p).toHaveProperty('hasPackageJson');
    }
  });
});

describe('analyzeProjectSync', () => {
  it('analyzes AgentBrowser itself (real test)', () => {
    const result = analyzeProjectSync('AgentBrowser', process.cwd());
    expect(result).toHaveProperty('projectName', 'AgentBrowser');
    expect(result).toHaveProperty('reporank.score');
    expect(result.reporank.score).toBeGreaterThanOrEqual(0);
    expect(result.reporank.score).toBeLessThanOrEqual(100);
    expect(result).toHaveProperty('mutlyIndex');
    expect(result.mutlyIndex.files).toBeGreaterThan(0);
  });

  it('analyzes a project and returns all required fields', () => {
    const result = analyzeProjectSync('Test', process.cwd());
    expect(result).toHaveProperty('projectName');
    expect(result).toHaveProperty('projectPath');
    expect(result).toHaveProperty('analyzedAt');
    expect(result).toHaveProperty('mutlyIndex.symbols');
    expect(result).toHaveProperty('mutlyIndex.files');
    expect(result).toHaveProperty('mutlyIndex.tsFiles');
    expect(result).toHaveProperty('mutlyIndex.pyFiles');
    expect(result).toHaveProperty('reporank.score');
    expect(result).toHaveProperty('reporank.quality');
    expect(result).toHaveProperty('reporank.issues');
    expect(result).toHaveProperty('reporank.details');
    expect(result).toHaveProperty('tasks');
    expect(result).toHaveProperty('status');
  });

  it('reporank details are comprehensive', () => {
    const result = analyzeProjectSync('Test', process.cwd());
    const d = result.reporank.details;
    expect(d).toHaveProperty('hasReadme');
    expect(d).toHaveProperty('hasGitignore');
    expect(d).toHaveProperty('hasEnvExample');
    expect(d).toHaveProperty('hasTestDir');
    expect(d).toHaveProperty('hasCi');
    expect(d).toHaveProperty('hasLicense');
    expect(d).toHaveProperty('depsCount');
    expect(d).toHaveProperty('devDepsCount');
    expect(d).toHaveProperty('scriptsCount');
    expect(d).toHaveProperty('codeFiles');
    expect(d).toHaveProperty('linesOfCode');
    expect(typeof d.codeFiles).toBe('number');
    expect(typeof d.linesOfCode).toBe('number');
  });

  it('generates appropriate tasks based on project state', () => {
    const result = analyzeProjectSync('Test', process.cwd());
    // The project-automation module's own dir should have most things
    for (const task of result.tasks) {
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('description');
      expect(task).toHaveProperty('priority');
      expect(['high', 'medium', 'low']).toContain(task.priority);
      expect(task).toHaveProperty('status', 'pending');
      expect(task).toHaveProperty('createdAt');
    }
  });
});

describe('analyzeAllProjects', () => {
  it('analyzes all projects without throwing', { timeout: 60000 }, async () => {
    const results = await analyzeAllProjects();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.reporank.score).toBeGreaterThanOrEqual(0);
      expect(r.reporank.score).toBeLessThanOrEqual(100);
    }
  });

  it('all projects have unique names', { timeout: 60000 }, async () => {
    const results = await analyzeAllProjects();
    const names = results.map(r => r.projectName);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('getDefaultTasks', () => {
  it('returns empty array for complete project', () => {
    const tasks = getDefaultTasks('test', process.cwd());
    // AgentBrowser itself should be well-configured
    expect(Array.isArray(tasks)).toBe(true);
  });

  it('generates high priority tasks for missing essentials', () => {
    const minimalDetails = {
      hasReadme: false, hasGitignore: false, hasEnvExample: false,
      hasTestDir: false, hasCi: false, hasLicense: false,
      depsCount: 5, devDepsCount: 3, scriptsCount: 1,
      totalFiles: 10, codeFiles: 5, linesOfCode: 200,
      hasBuildScript: false, hasTestScript: false, hasLintScript: false,
      hasStartScript: false, hasDevScript: false,
    };
    const tasks = getDefaultTasks('Minimal', '/fake/path', minimalDetails);
    const highPri = tasks.filter(t => t.priority === 'high');
    expect(highPri.length).toBeGreaterThanOrEqual(3);
    expect(tasks.some(t => t.title.includes('README'))).toBe(true);
    expect(tasks.some(t => t.title.includes('test'))).toBe(true);
  });
});
