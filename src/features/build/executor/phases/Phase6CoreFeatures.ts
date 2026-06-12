import { PhaseRunner, type PhaseInput, type PhaseResult } from '../PhaseRunner';

export class Phase6CoreFeatures extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal): Promise<PhaseResult> {
    const start = Date.now();
    try {
      const dir = input.name.replace(/[^a-zA-Z0-9-_]/g, '');

      this.writeFile(`${dir}/src/app/layout.tsx`,
        `import type { Metadata } from 'next';\n` +
        `export const metadata: Metadata = { title: '${input.name}' };\n` +
        `export default function RootLayout({ children }: { children: React.ReactNode }) {\n` +
        `  return (<html lang="en"><body>{children}</body></html>);\n` +
        `}\n`);

      this.writeFile(`${dir}/src/app/page.tsx`,
        `export default function Home() {\n` +
        `  return (<main><h1>Welcome to ${input.name}</h1><p>${input.description || 'Built with AgentBrowser'}</p></main>);\n` +
        `}\n`);

      this.writeFile(`${dir}/src/app/api/route.ts`,
        `import { NextResponse } from 'next/server';\n` +
        `export async function GET() { return NextResponse.json({ status: 'ok', project: '${input.name}' }); }\n`);

      return {
        phaseId, phaseName: 'Build Core Features', status: 'success',
        output: 'Core app files created: layout, page, API route',
        durationMs: Date.now() - start,
        artifacts: ['src/app/layout.tsx', 'src/app/page.tsx', 'src/app/api/route.ts'],
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'Build Core Features', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }
}
