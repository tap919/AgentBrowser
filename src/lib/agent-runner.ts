import { securityMiddleware } from './security-middleware';
import type { CustomAgent } from '@/features/agents/types';
import { PipelineExecutor } from '@/features/build/executor/PipelineExecutor';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { mkdtempSync } from 'node:fs';

interface AgentContext {
  id: string;
  name: string;
  description?: string;
  type: 'config' | 'code';
  securityTier: CustomAgent['securityTier'];
  enabled: boolean;
  addedAt: string;
  config?: object;
  code?: string;
}

export async function runAgent(
  context: AgentContext,
  action: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const validationLevel = context.securityTier === 'reduced' ? 'reduced' : 'full';

  const validationParams = { ...params, _tier: validationLevel };
  const result = await securityMiddleware.validateAction(action, validationParams);

  if (!result.approved) {
    return {
      success: false,
      error: `Security blocked: ${result.blockedReasons.join(', ')}`,
    };
  }

  const tmpDir = mkdtempSync('ab-agent-');
  try {
    const executor = new PipelineExecutor(tmpDir);

    if (params.projectName && typeof params.projectName === 'string') {
      const input = {
        name: params.projectName as string,
        description: (params.description as string) || context.description || '',
        type: (params.type as string) || 'Web App',
        audience: (params.audience as string) || 'General',
      };

      const onProgress = (_phase: number, _sub: number, _msg: string) => {
        // progress tracking - reserved for future use
      };

      const results = await executor.executeAll(input, onProgress);
      return {
        success: true,
        result: {
          message: `Agent executed ${results.length} phases`,
          phases: results.map(r => ({ id: r.phaseId, name: r.phaseName, status: r.status })),
          artifacts: results.flatMap(r => r.artifacts || []),
        },
      };
    }

    // Fallback for non-project agents — write config/code as artifact
    if (context.config || context.code) {
      const agentDir = path.join(tmpDir, context.id);
      fs.mkdirSync(agentDir, { recursive: true });
      if (context.config) {
        fs.writeFileSync(path.join(agentDir, 'config.json'), JSON.stringify(context.config, null, 2));
      }
      if (context.code) {
        fs.writeFileSync(path.join(agentDir, 'index.ts'), context.code);
      }
      return {
        success: true,
        result: { message: 'Agent artifacts written', artifactDir: agentDir },
      };
    }

    return { success: true, result: { message: 'Agent executed successfully' } };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export const agentRunner = {
  runAgent,
};
