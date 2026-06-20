import { PhaseRunner, type PhaseInput, type PhaseResult, type ProgressCallback } from '../PhaseRunner';
import * as path from 'path';
import * as fs from 'fs';

export class Phase4Foundation extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal, onProgress?: ProgressCallback): Promise<PhaseResult> {
    const start = Date.now();
    try {
      const safeName = input.name.replace(/[^a-zA-Z0-9-_]/g, '');
      const projectDir = path.join(this.workspaceDir, safeName);
      fs.mkdirSync(projectDir, { recursive: true });

      onProgress?.(0, 5, 'Initializing project workspace...');
      this.writeFile(path.join(safeName, '.gitignore'), [
        'node_modules',
        '.next',
        '.env',
        '*.local',
        'dist',
        'build',
        '.cache',
        'coverage',
        '.turbo',
      ].join('\n') + '\n');

      onProgress?.(1, 5, 'Setting up framework and build tooling...');
      const depsContent = await this.callAI(
        `You are a senior engineer. Output ONLY valid JSON with no markdown.`,
        `Generate package.json content for a Next.js project:
Name: ${input.name}
Description: ${input.description}
Type: ${input.type}

Return ONLY a JSON object with fields: name, version, private, scripts (dev, build, start, lint, test, typecheck), dependencies (next, react, react-dom, plus 3-5 relevant ones), devDependencies (typescript, @types/react, @types/node, plus 3-5 relevant ones).

Use version ranges with ^. Return ONLY valid JSON.`,
        signal
      );

      let pkg;
      try {
        pkg = JSON.parse(depsContent || '{}');
      } catch {
        pkg = {
          name: safeName.toLowerCase(),
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint',
            test: 'vitest run',
            typecheck: 'tsc --noEmit',
          },
          dependencies: {
            next: '^14.2.0',
            react: '^18.3.0',
            'react-dom': '^18.3.0',
          },
          devDependencies: {
            typescript: '^5.4.0',
            '@types/react': '^18.3.0',
            '@types/node': '^20.0.0',
          },
        };
      }
      this.writeFile(path.join(safeName, 'package.json'), JSON.stringify(pkg, null, 2));

      onProgress?.(2, 5, 'Configuring TypeScript and Next.js...');
      const tsconfig = {
        compilerOptions: {
          target: 'ES2017',
          lib: ['dom', 'dom.iterable', 'esnext'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'react-jsx',
          incremental: true,
          plugins: [{ name: 'next' }],
          paths: { '@/*': ['./src/*'] },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      };
      this.writeFile(path.join(safeName, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

      this.writeFile(path.join(safeName, 'next.config.ts'), [
        'import type { NextConfig } from "next";',
        '',
        'const nextConfig: NextConfig = {',
        '  reactStrictMode: true,',
        '};',
        '',
        'export default nextConfig;',
      ].join('\n'));

      onProgress?.(3, 5, 'Configuring environment variables...');
      this.writeFile(path.join(safeName, '.env.example'), [
        `# ${input.name} - Environment Variables`,
        `# Copy this file to .env and fill in your values`,
        '',
        `DATABASE_URL="postgresql://localhost:5432/${safeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}"`,
        'NEXT_PUBLIC_SITE_URL="http://localhost:3000"',
        'NEXTAUTH_SECRET="change-me-to-a-random-string"',
        'NEXTAUTH_URL="http://localhost:3000"',
      ].join('\n') + '\n');

      onProgress?.(4, 5, 'Creating base directory structure...');
      const dirs = [
        `${safeName}/src/app/api`,
        `${safeName}/src/components`,
        `${safeName}/src/lib`,
        `${safeName}/public`,
        `${safeName}/tests`,
      ];
      for (const d of dirs) {
        fs.mkdirSync(path.join(this.workspaceDir, d), { recursive: true });
      }

      try {
        await this.runCommand('git', ['init'], projectDir);
      } catch {}

      return {
        phaseId, phaseName: 'Set Up the Foundation', status: 'success',
        output: `Created project scaffold at ${projectDir} with package.json, TypeScript config, and directory structure`,
        durationMs: Date.now() - start,
        artifacts: ['package.json', 'tsconfig.json', 'next.config.ts', '.gitignore', '.env.example'],
        metrics: {
          filesCreated: 5,
        },
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'Set Up the Foundation', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }
}
