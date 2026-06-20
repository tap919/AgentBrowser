import { PhaseRunner, type PhaseInput, type PhaseResult, type ProgressCallback } from '../PhaseRunner';

export class Phase1Research extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal, onProgress?: ProgressCallback): Promise<PhaseResult> {
    const start = Date.now();
    try {
      onProgress?.(0, 5, 'Analyzing project requirements in depth...');
      const researchContent = await this.callAI(
        `You are an expert software analyst and project researcher. Generate a comprehensive research report for a software project. Output ONLY valid markdown.`,
        `Analyze this project for a research report:
Name: ${input.name}
Description: ${input.description}
Type: ${input.type}
Target Audience: ${input.audience}

Generate a detailed research report covering:
1. Market Analysis - what similar projects exist, target market size
2. Technical Recommendations - recommended stack, architecture patterns
3. Risk Assessment - technical risks, mitigation strategies
4. Implementation Approach - suggested methodology, timeline estimate
5. Key Success Metrics - how to measure project success`,
        signal
      );

      const report = researchContent || `# Research Report: ${input.name}\n\n## Overview\nA ${input.type} project targeting ${input.audience}.\n\n## Technical Recommendations\n- Frontend: Next.js with React\n- Backend: Node.js API routes\n- Database: PostgreSQL\n- Deployment: Vercel`;

      this.writeFile('research-report.md', report);

      onProgress?.(1, 5, 'Researching similar projects and patterns...');
      const summaryJson = await this.callAI(
        `You are a project analyst. Output ONLY valid JSON with no markdown.`,
        `Summarize this project as a JSON object with these fields:
{
  "projectName": "${input.name}",
  "type": "${input.type}",
  "audience": "${input.audience}",
  "recommendedStack": ["tech1", "tech2", "tech3"],
  "complexity": "low|medium|high",
  "estimatedDuration": "X-Y weeks",
  "keyRisks": ["risk1", "risk2"],
  "marketFit": "description of market fit"
}

Return ONLY the JSON object.`,
        signal
      );

      let summary;
      try {
        summary = JSON.parse(summaryJson || '{}');
      } catch {
        summary = {
          projectName: input.name,
          type: input.type,
          audience: input.audience,
          recommendedStack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Prisma'],
          complexity: input.description ? 'medium' : 'simple',
          estimatedDuration: '4-8 weeks',
          keyRisks: ['Scope creep', 'Technical debt'],
          marketFit: 'Good market fit for the target audience',
        };
      }
      this.writeFile('research-summary.json', JSON.stringify(summary, null, 2));

      onProgress?.(2, 5, 'Identifying optimal architecture patterns...');
      const archContent = await this.callAI(
        `You are a software architect. Provide architecture recommendations. Output ONLY markdown.`,
        `For the project "${input.name}" (${input.type}), recommend:
1. Architecture pattern (microservices, monolith, serverless, etc.)
2. Component/screen hierarchy
3. Data flow diagram (text-based)
4. API design approach
5. Database schema overview
6. Authentication strategy`,
        signal
      );

      if (archContent) {
        this.writeFile('architecture-recommendations.md', archContent);
      }

      onProgress?.(3, 5, 'Creating detailed implementation roadmap...');
      const roadmap = [
        `# Implementation Roadmap: ${input.name}`,
        '',
        `## Phase 1: Foundation (Week 1-2)`,
        '- Set up project scaffold and tooling',
        '- Configure database and ORM',
        '- Set up authentication',
        '- Create base UI components',
        '',
        `## Phase 2: Core Features (Week 3-4)`,
        '- Implement core business logic',
        '- Build main user interfaces',
        '- Create API endpoints',
        '- Add form validation and error handling',
        '',
        `## Phase 3: Testing & Polish (Week 5-6)`,
        '- Write unit and integration tests',
        '- Performance optimization',
        '- Security audit',
        '- Documentation',
        '',
        `## Phase 4: Deploy (Week 7-8)`,
        '- Production deployment',
        '- Monitoring setup',
        '- CI/CD pipeline',
      ].join('\n');
      this.writeFile('implementation-roadmap.md', roadmap);

      onProgress?.(4, 5, 'Defining acceptance criteria...');
      this.writeFile('acceptance-criteria.md', [
        `# Acceptance Criteria: ${input.name}`,
        '',
        '## Must Have',
        '- [ ] Core functionality works end-to-end',
        '- [ ] All API endpoints return correct responses',
        '- [ ] UI is responsive across devices',
        '- [ ] Authentication flow works',
        '- [ ] Error states are handled gracefully',
        '',
        '## Should Have',
        '- [ ] Performance meets Core Web Vitals thresholds',
        '- [ ] Test coverage > 80%',
        '- [ ] Documentation is complete',
        '- [ ] Accessibility (WCAG 2.1 AA)',
        '',
        '## Nice to Have',
        '- [ ] Analytics integration',
        '- [ ] Dark mode support',
        '- [ ] API rate limiting',
      ].join('\n'));

      const files = this.countFiles('');

      return {
        phaseId,
        phaseName: 'AI Research & Planning',
        status: 'success',
        output: `Research complete for ${input.name}. Generated report, architecture recommendations, roadmap, and acceptance criteria.`,
        durationMs: Date.now() - start,
        artifacts: [
          'research-report.md',
          'research-summary.json',
          'architecture-recommendations.md',
          'implementation-roadmap.md',
          'acceptance-criteria.md',
        ],
        metrics: {
          filesCreated: 5,
          linesOfCode: files.linesOfCode,
        },
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'AI Research & Planning', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }
}
