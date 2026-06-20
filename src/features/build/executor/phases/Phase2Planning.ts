import { PhaseRunner, type PhaseInput, type PhaseResult, type ProgressCallback } from '../PhaseRunner';

export class Phase2Planning extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal, onProgress?: ProgressCallback): Promise<PhaseResult> {
    const start = Date.now();
    try {
      onProgress?.(0, 4, 'Parsing project description...');
      const featuresJson = await this.callAI(
        `You are a product manager. Output ONLY valid JSON array with no markdown.`,
        `Generate a prioritized list of features for a project with:
Name: ${input.name}
Description: ${input.description}
Type: ${input.type}
Audience: ${input.audience}

Return ONLY a JSON array of feature objects:
[
  {"name": "feature name", "priority": "high|medium|low", "description": "brief description", "effort": "X days"}
]

Generate 6-10 features. Return ONLY valid JSON.`,
        signal
      );

      let features: Array<{ name: string; priority: string; description: string; effort: string }> = [];
      try {
        features = JSON.parse(featuresJson || '[]');
      } catch {
        features = [
          { name: 'User Authentication', priority: 'high', description: 'Email/password login and registration', effort: '3 days' },
          { name: 'Core Dashboard', priority: 'high', description: 'Main user interface after login', effort: '5 days' },
          { name: 'Data Management', priority: 'high', description: 'CRUD operations for primary data', effort: '4 days' },
          { name: 'Search & Filter', priority: 'medium', description: 'Search and filter functionality', effort: '3 days' },
          { name: 'Notifications', priority: 'medium', description: 'Push and in-app notifications', effort: '4 days' },
          { name: 'Settings Panel', priority: 'low', description: 'User preferences and settings', effort: '2 days' },
        ];
      }

      onProgress?.(1, 4, 'Generating complete feature list...');
      const plan = {
        projectName: input.name,
        version: '1.0.0',
        features: features.map(f => f.name),
        requirements: [
          'Node.js 18+',
          'PostgreSQL database',
          'SMTP server for email',
          'Redis for caching (optional)',
        ],
        milestones: [
          { name: 'MVP', duration: '2 weeks', features: features.filter(f => f.priority === 'high').map(f => f.name) },
          { name: 'Full release', duration: '4 weeks', features: features.map(f => f.name) },
        ],
        featureDetails: features,
      };

      this.writeFile('project-plan.json', JSON.stringify(plan, null, 2));

      onProgress?.(2, 4, 'Generating requirements specification...');
      const specContent = features.map((f, i) =>
        `### ${i + 1}. ${f.name}\n- **Priority**: ${f.priority}\n- **Effort**: ${f.effort}\n- **Description**: ${f.description}\n- **Status**: Pending`
      ).join('\n\n');

      this.writeFile('FEATURES.md', [
        `# Features: ${input.name}`,
        '',
        ...features.map(f => `- [ ] **${f.name}** (${f.priority}) - ${f.description}`),
      ].join('\n'));

      onProgress?.(3, 4, 'Confirming project scope...');
      this.writeFile('SCOPE.md', [
        `# Project Scope: ${input.name}`,
        '',
        `**Type**: ${input.type}`,
        `**Audience**: ${input.audience}`,
        '',
        '## In Scope',
        ...features.map(f => `- ${f.name}`),
        '',
        '## Out of Scope (v1)',
        '- Advanced analytics and reporting',
        '- Multi-language support',
        '- Third-party API marketplace',
        '- Mobile native apps',
        '',
        '## Constraints',
        '- Timeline: 4-6 weeks for MVP',
        '- Budget: Standard deployment costs',
        '- Team: Full-stack development',
      ].join('\n'));

      return {
        phaseId, phaseName: 'Understand What You Need',
        status: 'success',
        output: `Generated ${features.length} prioritized features for ${input.name}`,
        durationMs: Date.now() - start,
        artifacts: ['project-plan.json', 'FEATURES.md', 'SCOPE.md'],
        metrics: {
          filesCreated: 3,
        },
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'Understand What You Need', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }
}
