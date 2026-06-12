import { PhaseRunner, type PhaseInput, type PhaseResult } from '../PhaseRunner';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class Phase10Perf extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal): Promise<PhaseResult> {
    const start = Date.now();
    try {
      const dir = input.name.replace(/[^a-zA-Z0-9-_]/g, '');
      const projectDir = path.join(this.workspaceDir, dir);

      let totalSize = 0;
      let fileCount = 0;
      if (fs.existsSync(projectDir)) {
        const files = this.getAllFiles(projectDir);
        fileCount = files.length;
        totalSize = files.reduce((sum, f) => sum + (fs.statSync(f).size || 0), 0);
      }

      const report = {
        analyzedAt: new Date().toISOString(),
        project: input.name,
        fileCount,
        totalSizeBytes: totalSize,
        totalSizeKB: Math.round(totalSize / 1024),
        recommendations: [
          fileCount > 50 ? 'Consider code splitting' : 'Good file count',
          totalSize > 500000 ? 'Bundle may be large — consider tree-shaking' : 'Bundle size acceptable',
          'Enable gzip compression on server',
          'Use lazy loading for images and components',
        ],
        score: Math.min(100, 85 + (fileCount < 50 ? 10 : 0) + (totalSize < 500000 ? 5 : 0)),
      };

      this.writeFile(`${dir}/performance-report.json`, JSON.stringify(report, null, 2));

      return {
        phaseId, phaseName: 'Performance Optimization', status: 'success',
        output: `Analyzed ${fileCount} files (${Math.round(totalSize / 1024)}KB)`,
        durationMs: Date.now() - start,
        artifacts: ['performance-report.json'],
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
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
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
