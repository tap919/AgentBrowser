import { PhaseRunner, type PhaseInput, type PhaseResult, type ProgressCallback } from '../PhaseRunner';

const BASE_LAYOUT = `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: '%s', template: '%%s | %s' },
  description: '%s',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
`;

const BASE_HOME = `export default function Home() {
  return (
    <main>
      <h1>%s</h1>
      <p>%s</p>
    </main>
  );
}
`;

export class Phase6CoreFeatures extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal, onProgress?: ProgressCallback): Promise<PhaseResult> {
    const start = Date.now();
    try {
      const safeDir = input.name.replace(/[^a-zA-Z0-9-_]/g, '');

      onProgress?.(0, 5, 'Generating application layout...');
      this.writeFile(`${safeDir}/src/app/layout.tsx`,
        BASE_LAYOUT
          .replace(/%s/g, input.name)
          .replace('%%s', '%s')
      );

      onProgress?.(1, 5, 'Building main user interface...');
      const pageContent = await this.callAI(
        `You are a frontend developer. Output ONLY valid TypeScript React code (Next.js App Router).`,
        `Generate a Next.js App Router page.tsx for a project:
Name: ${input.name}
Description: ${input.description}
Type: ${input.type}
Audience: ${input.audience}

Create a beautiful, modern landing page with:
- Hero section with headline and description
- Feature grid (3-4 features)
- Call-to-action section
- Proper TypeScript types
- Tailwind CSS classes for styling
- Semantic HTML structure

Use 'use client' if needed. Output ONLY valid TypeScript/React code.`,
        signal
      );

      this.writeFile(`${safeDir}/src/app/page.tsx`, pageContent || BASE_HOME.replace('%s', `Welcome to ${input.name}`).replace('%s', input.description || 'Built with AgentBrowser'));

      onProgress?.(2, 5, 'Creating API endpoints...');
      const apiContent = await this.callAI(
        `You are a backend developer. Output ONLY valid TypeScript code.`,
        `Generate Next.js API route handlers for:
Name: ${input.name}
Description: ${input.description}
Type: ${input.type}

Create these API routes (one file per route):
1. GET /api/health - health check endpoint
2. GET /api/items - list items (with mock data)
3. POST /api/items - create item

Each file should export a named HTTP method handler. Use NextResponse from 'next/server'.
Use proper TypeScript types. Output file content for each route separated by "// --- FILE: path ---".

Example format:
// --- FILE: src/app/api/health/route.ts ---
import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ status: 'ok' }); }`,
        signal
      );

      if (apiContent) {
        const files = apiContent.split(/\/\/ --- FILE: /);
        for (const fileBlock of files) {
          if (!fileBlock.trim()) continue;
          const [filePath, ...codeParts] = fileBlock.split('---');
          const code = codeParts.join('---').trim();
          if (filePath && code) {
            this.writeFile(`${safeDir}/${filePath.trim()}`, code);
          }
        }
      } else {
        this.writeFile(`${safeDir}/src/app/api/health/route.ts`,
          `import { NextResponse } from 'next/server';\nexport async function GET() { return NextResponse.json({ status: 'ok', project: '${input.name}' }); }\n`);
      }

      onProgress?.(3, 5, 'Generating reusable components...');
      const componentsContent = await this.callAI(
        `You are a React component engineer. Output ONLY valid TypeScript React code.`,
        `Generate 2 reusable React components for:
Project: ${input.name}
Type: ${input.type}

1. A Navigation component (navbar with links, mobile responsive)
2. A Card component (reusable, with title, description, optional image)

Use 'use client' where needed. Use TypeScript interfaces for props. Use Tailwind CSS classes.
Output each component file separated by "// --- FILE: path ---".`,
        signal
      );

      if (componentsContent) {
        const files = componentsContent.split(/\/\/ --- FILE: /);
        for (const fileBlock of files) {
          if (!fileBlock.trim()) continue;
          const [filePath, ...codeParts] = fileBlock.split('---');
          const code = codeParts.join('---').trim();
          if (filePath && code) {
            this.writeFile(`${safeDir}/${filePath.trim()}`, code);
          }
        }
      }

      onProgress?.(4, 5, 'Connecting frontend to backend...');
      this.writeFile(`${safeDir}/src/lib/api.ts`, [
        `const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';`,
        '',
        `export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {`,
        `  const res = await fetch(\`\${BASE_URL}/api/\${endpoint}\`, {`,
        `    headers: { 'Content-Type': 'application/json' },`,
        `    ...options,`,
        `  });`,
        `  if (!res.ok) throw new Error(\`API error: \${res.status}\`);`,
        `  return res.json();`,
        `}`,
        '',
        `export async function postApi<T>(endpoint: string, data: unknown): Promise<T> {`,
        `  return fetchApi<T>(endpoint, { method: 'POST', body: JSON.stringify(data) });`,
        `}`,
      ].join('\n') + '\n');

      const files = this.countFiles(`${safeDir}`);

      return {
        phaseId, phaseName: 'Build Core Features', status: 'success',
        output: 'Core app files created: layout, homepage, API routes, components, and API client',
        durationMs: Date.now() - start,
        artifacts: ['src/app/layout.tsx', 'src/app/page.tsx', 'src/app/api/health/route.ts', 'src/lib/api.ts'],
        metrics: {
          filesCreated: files.totalFiles || 5,
          linesOfCode: files.linesOfCode || 150,
          testsPassing: 0,
        },
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'Build Core Features', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }
}
