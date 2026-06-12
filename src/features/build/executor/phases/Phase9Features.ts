import { PhaseRunner, type PhaseInput, type PhaseResult } from '../PhaseRunner';

export class Phase9Features extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal): Promise<PhaseResult> {
    const start = Date.now();
    try {
      const dir = input.name.replace(/[^a-zA-Z0-9-_]/g, '');

      this.writeFile(`${dir}/src/app/error.tsx`,
        `'use client';\nexport default function Error({ reset }: { error: Error; reset: () => void }) {\n` +
        `  return (<div><h2>Something went wrong</h2><button onClick={reset}>Retry</button></div>);\n` +
        `}\n`);

      this.writeFile(`${dir}/src/app/loading.tsx`,
        `export default function Loading() {\n` +
        `  return (<div><p>Loading...</p></div>);\n` +
        `}\n`);

      this.writeFile(`${dir}/src/lib/utils.ts`,
        `export function cn(...classes: (string | undefined | false)[]): string {\n` +
        `  return classes.filter(Boolean).join(' ');\n` +
        `}\n` +
        `export function formatDate(date: Date): string {\n` +
        `  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });\n` +
        `}\n`);

      return {
        phaseId, phaseName: 'Build Remaining Features', status: 'success',
        output: 'Error boundary, loading state, and utilities created',
        durationMs: Date.now() - start,
        artifacts: ['src/app/error.tsx', 'src/app/loading.tsx', 'src/lib/utils.ts'],
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'Build Remaining Features', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }
}
