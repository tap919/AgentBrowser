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
}

export abstract class PhaseRunner {
  constructor(protected workspaceDir: string) {}

  abstract execute(
    phaseId: number,
    input: PhaseInput,
    signal?: AbortSignal
  ): Promise<PhaseResult>;

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
}
