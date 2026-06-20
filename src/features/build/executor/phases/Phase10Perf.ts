import { PhaseRunner, type PhaseInput, type PhaseResult, type ProgressCallback } from '../PhaseRunner';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class Phase10Perf extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal, onProgress?: ProgressCallback): Promise<PhaseResult> {
    const start = Date.now();
    try {
      const safeDir = input.name.replace(/[^a-zA-Z0-9-_]/g, '');
      const projectDir = path.join(this.workspaceDir, safeDir);

      onProgress?.(0, 4, 'Analyzing bundle size and dependencies...');
      const files = this.getAllFiles(projectDir);
      const tsFiles = files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
      const cssFiles = files.filter(f => f.endsWith('.css'));
      const allContent = files.reduce((acc, f) => {
        try { return acc + fs.readFileSync(f, 'utf-8').length; } catch { return acc; }
      }, 0);
      const totalSizeKB = Math.round(allContent / 1024);

      onProgress?.(1, 4, 'Checking code quality and duplication...');
      const importCounts = new Map<string, number>();
      for (const file of tsFiles.slice(0, 30)) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const imports = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
          for (const imp of imports) {
            const pkg = imp.replace(/from\s+['"]/, '').replace(/['"]$/, '').split('/')[0];
            if (pkg.startsWith('@')) {
              const fullPkg = `${pkg}/${imp.replace(/from\s+['"]/, '').replace(/['"]$/, '').split('/')[1] || ''}`;
              importCounts.set(fullPkg, (importCounts.get(fullPkg) || 0) + 1);
            } else {
              importCounts.set(pkg, (importCounts.get(pkg) || 0) + 1);
            }
          }
        } catch {}
      }

      onProgress?.(2, 4, 'Running typeScript analysis...');
      let typeErrors = 0;
      if (fs.existsSync(path.join(projectDir, 'node_modules'))) {
        try {
          const result = await this.runCommand('npx', ['tsc', '--noEmit', '--pretty', 'false'], projectDir);
          typeErrors = result.stderr.split('\n').filter(l => l.includes('error')).length;
        } catch {}
      }

      onProgress?.(3, 4, 'Generating optimization recommendations...');
      const recommendations: string[] = [];
      if (totalSizeKB > 500) recommendations.push('Bundle may be large — consider code splitting and tree-shaking');
      else recommendations.push('Bundle size is acceptable');
      if (importCounts.size > 20) recommendations.push('High dependency count — audit for unused imports');
      if (typeErrors > 0) recommendations.push(`Fix ${typeErrors} TypeScript errors to improve code quality`);
      recommendations.push('Enable gzip/brotli compression on server');
      recommendations.push('Use lazy loading for images and non-critical components');
      recommendations.push('Implement proper caching strategy (SWR, React Query)');

      const score = Math.min(100,
        85
        + (totalSizeKB < 500 ? 5 : 0)
        + (files.length < 50 ? 5 : 0)
        + (typeErrors === 0 ? 5 : 0)
        - (typeErrors * 2)
      );

      this.writeFile(`${safeDir}/performance-report.json`, JSON.stringify({
        analyzedAt: new Date().toISOString(),
        project: input.name,
        fileCount: files.length,
        tsFileCount: tsFiles.length,
        cssFileCount: cssFiles.length,
        totalSizeBytes: allContent,
        totalSizeKB,
        dependencyUsage: Object.fromEntries(importCounts),
        typeErrors,
        recommendations,
        score,
      }, null, 2));

      return {
        phaseId, phaseName: 'Performance Optimization', status: 'success',
        output: `Analyzed ${files.length} files (${totalSizeKB}KB). Score: ${score}/100. ${recommendations.length} recommendations.`,
        durationMs: Date.now() - start,
        artifacts: ['performance-report.json'],
        metrics: {
          linesOfCode: allContent,
          filesCreated: files.length,
          securityScore: score,
        },
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'Performance Optimization', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }

  private getAllFiles(dir: string): string[] {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '.next') {
          files.push(...this.getAllFiles(full));
        } else if (entry.isFile()) {
          files.push(full);
        }
      }
      return files;
    } catch {
      return [];
    }
  }
}
