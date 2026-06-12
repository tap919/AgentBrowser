import { PhaseRunner, type PhaseInput, type PhaseResult } from '../PhaseRunner';
import * as path from 'path';
import * as fs from 'fs';

export class Phase4Foundation extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal): Promise<PhaseResult> {
    const start = Date.now();
    try {
      const projectDir = path.join(this.workspaceDir, input.name.replace(/[^a-zA-Z0-9-_]/g, ''));
      fs.mkdirSync(projectDir, { recursive: true });

      // .gitignore
      this.writeFile(path.join(input.name, '.gitignore'), `node_modules\n.next\n.env\n*.local\n`);

      // package.json
      const pkg = {
        name: input.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
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
      this.writeFile(path.join(input.name, 'package.json'), JSON.stringify(pkg, null, 2));

      // tsconfig.json
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
      this.writeFile(path.join(input.name, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

      // Initialize git repo
      try {
        await this.runCommand('git', ['init'], projectDir);
      } catch {
        // git not available — non-fatal
      }

      return {
        phaseId, phaseName: 'Set Up the Foundation', status: 'success',
        output: `Created project scaffold at ${projectDir}`,
        durationMs: Date.now() - start,
        artifacts: ['package.json', 'tsconfig.json', '.gitignore'],
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'Set Up the Foundation', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }
}
