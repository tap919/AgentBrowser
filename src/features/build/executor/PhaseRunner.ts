import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'child_process';

export interface PhaseInput {
  name: string;
  description: string;
  type: string;
  audience: string;
  techStack?: string[];
}

export interface PhaseResult {
  phaseId: number;
  phaseName: string;
  status: 'success' | 'failed' | 'aborted';
  output: string;
  durationMs: number;
  error?: string;
  artifacts?: string[];
  metrics?: {
    linesOfCode?: number;
    filesCreated?: number;
    testsPassing?: number;
    securityScore?: number;
  };
}

export type ProgressCallback = (subStep: number, totalSteps: number, message: string) => void;

export abstract class PhaseRunner {
  constructor(protected workspaceDir: string) {}

  abstract execute(
    phaseId: number,
    input: PhaseInput,
    signal?: AbortSignal,
    onProgress?: ProgressCallback,
  ): Promise<PhaseResult>;

  protected async callAI(systemPrompt: string, userPrompt: string, signal?: AbortSignal): Promise<string> {
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      if (signal?.aborted) return '';
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      return completion.choices[0]?.message?.content || '';
    } catch (err) {
      console.warn(`[PhaseRunner] AI call failed:`, (err as Error).message);
      return '';
    }
  }

  protected async runCommand(
    cmd: string,
    args: string[],
    cwd?: string
  ): Promise<{ stdout: string; stderr: string }> {
    try {
      const output = execSync(`"${cmd}" ${args.map(a => `"${a}"`).join(' ')}`, {
        cwd: cwd || this.workspaceDir,
        timeout: 30000,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      });
      return { stdout: (output as string)?.trim() || '', stderr: '' };
    } catch (err: unknown) {
      const execErr = err as { stdout?: Buffer; stderr?: Buffer; message?: string };
      return {
        stdout: execErr.stdout?.toString()?.trim() || '',
        stderr: execErr.stderr?.toString()?.trim() || execErr.message || 'Command failed',
      };
    }
  }

  protected mkdirp(dir: string): void {
    fs.mkdirSync(path.join(this.workspaceDir, dir), { recursive: true });
  }

  protected writeFile(relativePath: string, content: string): void {
    const fullPath = path.join(this.workspaceDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  protected countFiles(dir: string): { totalFiles: number; linesOfCode: number } {
    let totalFiles = 0;
    let linesOfCode = 0;
    try {
      const walk = (d: string) => {
        const entries = fs.readdirSync(d, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(d, entry.name);
          if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '.next') {
              walk(full);
            }
          } else if (entry.isFile()) {
            totalFiles++;
            try {
              const content = fs.readFileSync(full, 'utf-8');
              linesOfCode += content.split('\n').length;
            } catch {}
          }
        }
      };
      walk(this.workspaceDir);
    } catch {}
    return { totalFiles, linesOfCode };
  }
}
