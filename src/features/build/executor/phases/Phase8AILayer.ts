import { PhaseRunner, type PhaseInput, type PhaseResult } from '../PhaseRunner';

export class Phase8AILayer extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal): Promise<PhaseResult> {
    const start = Date.now();
    try {
      const dir = input.name.replace(/[^a-zA-Z0-9-_]/g, '');

      this.writeFile(`${dir}/ai-config.json`, JSON.stringify({
        projectName: input.name,
        llmProvider: 'openai',
        model: 'gpt-4',
        promptTemplates: {
          codeReview: 'Review the following code for security, performance, and best practices: {{code}}',
          testGeneration: 'Generate unit tests for: {{code}}',
        },
        features: ['auto-code-review', 'test-generation', 'docs-generation'],
        enabled: true,
      }, null, 2));

      this.writeFile(`${dir}/src/lib/ai.ts`,
        `export async function callAI(prompt: string): Promise<string> {\n` +
        `  const res = await fetch('https://api.openai.com/v1/chat/completions', {\n` +
        `    method: 'POST',\n` +
        `    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.OPENAI_API_KEY },\n` +
        `    body: JSON.stringify({ model: 'gpt-4', messages: [{ role: 'user', content: prompt }] }),\n` +
        `  });\n` +
        `  const data = await res.json();\n` +
        `  return data.choices?.[0]?.message?.content || '';\n` +
        `}\n`);

      return {
        phaseId, phaseName: 'AI-Powered Automation Layer', status: 'success',
        output: 'AI config and client created',
        durationMs: Date.now() - start,
        artifacts: ['ai-config.json', 'src/lib/ai.ts'],
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'AI-Powered Automation Layer', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }
}
