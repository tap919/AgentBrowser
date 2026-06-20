import { PhaseRunner, type PhaseInput, type PhaseResult, type ProgressCallback } from '../PhaseRunner';

export class Phase9Features extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal, onProgress?: ProgressCallback): Promise<PhaseResult> {
    const start = Date.now();
    try {
      const safeDir = input.name.replace(/[^a-zA-Z0-9-_]/g, '');

      onProgress?.(0, 5, 'Implementing secondary features...');
      const secondaryContent = await this.callAI(
        `You are a frontend developer. Output ONLY valid TypeScript React code.`,
        `Generate a Next.js error.tsx and loading.tsx for:
Project: ${input.name}

error.tsx: A client component that shows error state with a retry button
loading.tsx: A loading/suspense fallback component with a spinner

Use 'use client' for error.tsx. Use Tailwind CSS. Output each file separated by "// --- FILE: path ---".`,
        signal
      );

      if (secondaryContent) {
        const files = secondaryContent.split(/\/\/ --- FILE: /);
        for (const fileBlock of files) {
          if (!fileBlock.trim()) continue;
          const [filePath, ...codeParts] = fileBlock.split('---');
          const code = codeParts.join('---').trim();
          if (filePath && code) {
            this.writeFile(`${safeDir}/${filePath.trim()}`, code);
          }
        }
      } else {
        this.writeFile(`${safeDir}/src/app/error.tsx`,
          `'use client';\nexport default function Error({ reset }: { error: Error; reset: () => void }) {\n  return (<div style={{padding:'2rem',textAlign:'center'}}><h2>Something went wrong</h2><button onClick={reset} style={{padding:'0.5rem 1rem',marginTop:'1rem',cursor:'pointer'}}>Try again</button></div>);\n}\n`);
        this.writeFile(`${safeDir}/src/app/loading.tsx`,
          `export default function Loading() {\n  return (<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'50vh'}}><p>Loading...</p></div>);\n}\n`);
      }

      onProgress?.(1, 5, 'Adding error handling and edge cases...');
      this.writeFile(`${safeDir}/src/app/not-found.tsx`, [
        `import Link from 'next/link';`,
        '',
        `export default function NotFound() {`,
        `  return (`,
        `    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>`,
        `      <h1 style={{ fontSize: '3rem', fontWeight: 800 }}>404</h1>`,
        `      <p style={{ margin: '1rem 0', color: '#666' }}>Page not found</p>`,
        `      <Link href="/" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Go home</Link>`,
        `    </div>`,
        `  );`,
        `}`,
      ].join('\n') + '\n');

      onProgress?.(2, 5, 'Building settings and preferences...');
      this.writeFile(`${safeDir}/src/lib/utils.ts`, [
        `export function cn(...classes: (string | undefined | false | null)[]): string {`,
        `  return classes.filter(Boolean).join(' ');`,
        `}`,
        '',
        `export function formatDate(date: Date | string): string {`,
        `  return new Date(date).toLocaleDateString('en-US', {`,
        `    year: 'numeric',`,
        `    month: 'long',`,
        `    day: 'numeric',`,
        `  });`,
        `}`,
        '',
        `export function slugify(text: string): string {`,
        `  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');`,
        `}`,
        '',
        `export function truncate(text: string, maxLength: number): string {`,
        `  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;`,
        `}`,
      ].join('\n') + '\n');

      onProgress?.(3, 5, 'Creating notification system...');
      this.writeFile(`${safeDir}/src/lib/notifications.ts`, [
        `export type NotificationType = 'success' | 'error' | 'info' | 'warning';`,
        '',
        `export interface Notification {`,
        `  id: string;`,
        `  type: NotificationType;`,
        `  title: string;`,
        `  message?: string;`,
        `  duration?: number;`,
        `}`,
        '',
        `const listeners: Array<(n: Notification) => void> = [];`,
        '',
        `export function onNotification(cb: (n: Notification) => void): () => void {`,
        `  listeners.push(cb);`,
        `  return () => { const i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); };`,
        `}`,
        '',
        `export function notify(title: string, options?: Partial<Omit<Notification, 'id' | 'title'>>): Notification {`,
        `  const n: Notification = { id: crypto.randomUUID(), title, type: 'info', ...options };`,
        `  listeners.forEach(cb => cb(n));`,
        `  return n;`,
        `}`,
      ].join('\n') + '\n');

      onProgress?.(4, 5, 'Adding loading states and transitions...');
      this.writeFile(`${safeDir}/src/components/Spinner.tsx`, [
        `interface SpinnerProps {`,
        `  size?: 'sm' | 'md' | 'lg';`,
        `  className?: string;`,
        `}`,
        '',
        `const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };`,
        '',
        `export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {`,
        `  return (`,
        `    <div`,
        `      className={\`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 \${sizes[size]} \${className}\`}`,
        `      role="status"`,
        `      aria-label="Loading"`,
        `    />`,
        `  );`,
        `}`,
      ].join('\n') + '\n');

      const files = this.countFiles(`${safeDir}`);

      return {
        phaseId, phaseName: 'Build Remaining Features', status: 'success',
        output: 'Error boundaries, loading states, utilities, notifications, and spinner component created',
        durationMs: Date.now() - start,
        artifacts: [
          'src/app/error.tsx', 'src/app/loading.tsx', 'src/app/not-found.tsx',
          'src/lib/utils.ts', 'src/lib/notifications.ts', 'src/components/Spinner.tsx',
        ],
        metrics: {
          filesCreated: 6,
          linesOfCode: files.linesOfCode || 80,
        },
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'Build Remaining Features', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }
}
