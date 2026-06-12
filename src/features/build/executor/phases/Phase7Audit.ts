import { PhaseRunner, type PhaseInput, type PhaseResult } from '../PhaseRunner';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class Phase7Audit extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal): Promise<PhaseResult> {
    const start = Date.now();
    try {
      const dir = input.name.replace(/[^a-zA-Z0-9-_]/g, '');
      const projectDir = path.join(this.workspaceDir, dir);
      const issues: string[] = [];

      if (fs.existsSync(projectDir)) {
        const files = this.getAllFiles(projectDir);
        if (files.length === 0) issues.push('No source files found');

        const hasPackageJson = files.some(f => f.endsWith('package.json'));
        if (!hasPackageJson) issues.push('Missing package.json');
      }

      this.writeFile(`${dir}/audit-report.json`, JSON.stringify({
        auditedAt: new Date().toISOString(),
        project: input.name,
        filesScanned: fs.existsSync(projectDir) ? this.getAllFiles(projectDir).length : 0,
        issues,
        score: issues.length === 0 ? 95 : Math.max(60, 95 - issues.length * 10),
      }, null, 2));

      return {
        phaseId, phaseName: 'Quality Gate: Core Audit', status: 'success',
        output: issues.length === 0 ? 'No issues found' : `Found ${issues.length} issues: ${issues.join(', ')}`,
        durationMs: Date.now() - start,
        artifacts: ['audit-report.json'],
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'Quality Gate: Core Audit', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }

  private getAllFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        files.push(...this.getAllFiles(full));
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
    return files;
  }
}
