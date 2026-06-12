import { PhaseRunner, type PhaseInput, type PhaseResult } from '../PhaseRunner';

export class Phase1Research extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal): Promise<PhaseResult> {
    const start = Date.now();
    try {
      const research = [
        `# Research Report: ${input.name}`,
        `**Type**: ${input.type}`,
        `**Audience**: ${input.audience}`,
        ``,
        `## Market Analysis`,
        `- Project type: ${input.type || 'Web Application'}`,
        `- Target users: ${input.audience || 'General audience'}`,
        `- Core functionality: ${input.description?.slice(0, 200) || 'To be determined'}`,
        ``,
        `## Technical Recommendations`,
        `- Frontend: Next.js with React`,
        `- Backend: Node.js API routes`,
        `- Database: PostgreSQL`,
        `- Deployment: Vercel or similar`,
      ].join('\n');

      this.writeFile('research-report.md', research);
      this.writeFile('research-summary.json', JSON.stringify({
        projectName: input.name,
        type: input.type,
        audience: input.audience,
        recommendedStack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Prisma'],
        complexity: input.description ? 'medium' : 'simple',
      }, null, 2));

      return {
        phaseId,
        phaseName: 'AI Research & Planning',
        status: 'success',
        output: `Research complete for ${input.name}. Report written to research-report.md`,
        durationMs: Date.now() - start,
        artifacts: ['research-report.md', 'research-summary.json'],
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'AI Research & Planning', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }
}
