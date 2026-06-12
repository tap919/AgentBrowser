import { PhaseRunner, type PhaseInput, type PhaseResult } from '../PhaseRunner';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class Phase12Deploy extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal): Promise<PhaseResult> {
    const start = Date.now();
    try {
      const dir = input.name.replace(/[^a-zA-Z0-9-_]/g, '');
      const projectDir = path.join(this.workspaceDir, dir);

      // Create VERCEL.md with deployment instructions
      this.writeFile(`${dir}/VERCEL.md`,
        `# Deploy ${input.name}\n\n` +
        `## One-click deploy\n` +
        `[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)\n\n` +
        `## Manual deploy\n` +
        `1. Push to GitHub\n` +
        `2. Import repo in Vercel\n` +
        `3. Set environment variables\n` +
        `4. Deploy\n`);

      // Create .env.example
      this.writeFile(`${dir}/.env.example`,
        `# ${input.name} Environment Variables\n` +
        `DATABASE_URL=postgresql://localhost:5432/${input.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}\n` +
        `NEXT_PUBLIC_SITE_URL=http://localhost:3000\n`);

      // Try git commit
      try {
        if (fs.existsSync(path.join(projectDir, '.git'))) {
          await this.runCommand('git', ['add', '-A'], projectDir);
          await this.runCommand('git', ['commit', '-m', `"Initial commit: ${input.name}"`, '--allow-empty'], projectDir);
        }
      } catch {
        // git not configured — non-fatal
      }

      // Generate deployment summary
      this.writeFile(`${dir}/DEPLOYMENT_SUMMARY.md`,
        `# Deployment Summary: ${input.name}\n\n` +
        `- **Project**: ${input.name}\n` +
        `- **Type**: ${input.type}\n` +
        `- **Audience**: ${input.audience}\n` +
        `- **Files**: ${this.countFiles(projectDir)}\n` +
        `- **Ready for**: Vercel, Netlify, or any Node.js host\n` +
        `- **Stack**: Next.js + TypeScript\n`);

      return {
        phaseId, phaseName: 'Deploy and Deliver', status: 'success',
        output: `Project ${input.name} is ready for deployment`,
        durationMs: Date.now() - start,
        artifacts: ['VERCEL.md', '.env.example', 'DEPLOYMENT_SUMMARY.md'],
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'Deploy and Deliver', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }

  private countFiles(dir: string): number {
    try {
      let count = 0;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          count += this.countFiles(path.join(dir, entry.name));
        } else if (entry.isFile()) {
          count++;
        }
      }
      return count;
    } catch {
      return 0;
    }
  }
}
