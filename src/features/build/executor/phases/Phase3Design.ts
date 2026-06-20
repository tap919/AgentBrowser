import { PhaseRunner, type PhaseInput, type PhaseResult, type ProgressCallback } from '../PhaseRunner';

const BASE_SCHEMA = `model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      String   @default("user")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;

export class Phase3Design extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal, onProgress?: ProgressCallback): Promise<PhaseResult> {
    const start = Date.now();
    try {
      onProgress?.(0, 5, 'Designing database schema and models...');
      const schemaContent = await this.callAI(
        `You are a database architect. Output ONLY valid Prisma schema code. No markdown, no explanation.`,
        `Design a Prisma schema for this project:
Name: ${input.name}
Description: ${input.description}
Type: ${input.type}

Include:
- User model (already defined below)
- 3-5 additional models relevant to the project
- Proper relations (hasMany, belongsTo, etc.)
- Appropriate field types and attributes
- Timestamps for all models

Base User model:
${BASE_SCHEMA}

Return ONLY the complete Prisma schema with all models.`,
        signal
      );

      const schema = schemaContent || BASE_SCHEMA;
      this.writeFile('prisma/schema.prisma', schema);

      onProgress?.(1, 5, 'Planning API endpoints and contracts...');
      const apiDesign = await this.callAI(
        `You are an API designer. Output ONLY valid JSON with no markdown.`,
        `Design the API endpoints for:
Name: ${input.name}
Description: ${input.description}
Type: ${input.type}

Return a JSON object:
{
  "endpoints": [
    {"method": "GET", "path": "/api/...", "description": "...", "auth": true|false}
  ],
  "components": ["Component1", "Component2"],
  "dataModels": ["Model1", "Model2"]
}

Generate 8-12 endpoints. Return ONLY valid JSON.`,
        signal
      );

      let design;
      try {
        design = JSON.parse(apiDesign || '{}');
      } catch {
        design = {
          endpoints: [
            { method: 'GET', path: '/api/users', description: 'List users', auth: true },
            { method: 'POST', path: '/api/users', description: 'Create user', auth: true },
            { method: 'GET', path: '/api/users/:id', description: 'Get user by ID', auth: true },
            { method: 'PUT', path: '/api/users/:id', description: 'Update user', auth: true },
            { method: 'DELETE', path: '/api/users/:id', description: 'Delete user', auth: true },
          ],
          components: ['AppLayout', 'Dashboard', 'DataTable', 'FormBuilder', 'Modal', 'Navigation'],
          dataModels: ['User'],
        };
      }

      onProgress?.(2, 5, 'Defining component hierarchy...');
      this.writeFile('design-spec.json', JSON.stringify({
        schema: 'Prisma with extended models',
        apiEndpoints: design.endpoints || design.apiEndpoints,
        components: design.components,
        dataModels: design.dataModels,
        techStack: input.techStack || ['Next.js', 'TypeScript', 'Tailwind CSS', 'Prisma'],
      }, null, 2));

      onProgress?.(3, 5, 'Choosing libraries and dependencies...');
      const depsContent = await this.callAI(
        `You are a senior engineer. Output ONLY valid JSON with no markdown.`,
        `Recommend npm dependencies for:
Name: ${input.name}
Description: ${input.description}
Type: ${input.type}

Return JSON:
{
  "dependencies": {"package-name": "^version"},
  "devDependencies": {"package-name": "^version"}
}

List 8-12 total packages appropriate for a Next.js project. Return ONLY valid JSON.`,
        signal
      );

      let deps;
      try {
        deps = JSON.parse(depsContent || '{}');
      } catch {
        deps = {
          dependencies: {
            'next': '^14.2.0',
            'react': '^18.3.0',
            'react-dom': '^18.3.0',
            '@prisma/client': '^5.0.0',
            'next-auth': '^4.24.0',
          },
          devDependencies: {
            'typescript': '^5.4.0',
            '@types/react': '^18.3.0',
            '@types/node': '^20.0.0',
            'prisma': '^5.0.0',
            'vitest': '^1.0.0',
          },
        };
      }
      this.writeFile('dependencies.json', JSON.stringify(deps, null, 2));

      onProgress?.(4, 5, 'Creating file and folder structure...');
      this.writeFile('project-structure.md', [
        `# Project Structure: ${input.name}`,
        '',
        '```',
        `${input.name.replace(/[^a-zA-Z0-9-_]/g, '')}/`,
        '├── prisma/',
        '│   └── schema.prisma',
        '├── src/',
        '│   ├── app/',
        '│   │   ├── api/',
        '│   │   │   └── ...',
        '│   │   ├── layout.tsx',
        '│   │   └── page.tsx',
        '│   ├── components/',
        '│   │   └── ...',
        '│   └── lib/',
        '│       └── ...',
        '├── public/',
        '├── tests/',
        '├── package.json',
        '├── tsconfig.json',
        '├── next.config.ts',
        '└── .env.example',
        '```',
      ].join('\n'));

      return {
        phaseId, phaseName: 'Design the System', status: 'success',
        output: `Designed schema, ${design.endpoints?.length || 0} API endpoints, and component structure`,
        durationMs: Date.now() - start,
        artifacts: ['prisma/schema.prisma', 'design-spec.json', 'dependencies.json', 'project-structure.md'],
        metrics: {
          filesCreated: 4,
        },
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'Design the System', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }
}
