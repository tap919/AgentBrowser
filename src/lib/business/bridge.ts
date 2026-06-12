import { securityMiddleware } from '@/lib/security-middleware';
import type { BusinessSkillId } from './skills';
import type { Transaction } from './finance';

const BIG_HOMIE_URL = process.env.NEXT_PUBLIC_BIG_HOMIE_URL || 'http://localhost:8888';

export interface BusinessCommand {
  skill: BusinessSkillId;
  action: string;
  params: Record<string, unknown>;
}

export interface BusinessResult {
  success: boolean;
  skill: BusinessSkillId;
  output: unknown;
  duration: number;
  error?: string;
  securedBy: 'claw-protect' | 'skip';
}

async function validateWithClawProtect(command: BusinessCommand): Promise<void> {
  const result = await securityMiddleware.validateAction(
    `business:${command.skill}:${command.action}`,
    { _tier: 'full', ...command.params } as Record<string, unknown>
  );

  if (!result.approved) {
    throw new Error(`Claw Protect blocked: ${result.blockedReasons.join(', ')}`);
  }
}

export async function executeBusinessSkill(command: BusinessCommand): Promise<BusinessResult> {
  const start = Date.now();

  try {
    await validateWithClawProtect(command);

    // Forward to Big Homie backend for execution
    const response = await fetch(`${BIG_HOMIE_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill: command.skill,
        action: command.action,
        config: command.params,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Big Homie execution failed');
      return {
        success: false, skill: command.skill, output: null,
        duration: Date.now() - start, error: errorText, securedBy: 'claw-protect',
      };
    }

    const output = await response.json();
    return {
      success: true, skill: command.skill, output,
      duration: Date.now() - start, securedBy: 'claw-protect',
    };
  } catch (err: any) {
    return {
      success: false, skill: command.skill, output: null,
      duration: Date.now() - start,
      error: err.message || 'Unknown error',
      securedBy: err.message?.includes('Claw Protect') ? 'claw-protect' : 'skip',
    };
  }
}

export async function executeMultipleSkills(commands: BusinessCommand[]): Promise<BusinessResult[]> {
  // Run skills sequentially (not parallel) to respect Claw Protect rate limits
  const results: BusinessResult[] = [];
  for (const cmd of commands) {
    results.push(await executeBusinessSkill(cmd));
  }
  return results;
}

export async function runDailyBusinessRoutine(): Promise<BusinessResult[]> {
  return executeMultipleSkills([
    { skill: 'budget-tracking', action: 'check-budgets', params: { autoAlert: true } },
    { skill: 'revenue-analysis', action: 'track-revenue', params: { streams: ['music', 'software'] } },
    { skill: 'content-creation', action: 'generate-content', params: { count: 2, platforms: ['blog'] } },
    { skill: 'music-promotion', action: 'check-analytics', params: { artists: ['Tap919', 'Niro'] } },
  ]);
}

export async function runWeeklyBusinessRoutine(): Promise<BusinessResult[]> {
  return executeMultipleSkills([
    { skill: 'market-research', action: 'scan-trends', params: { industry: 'music-tech' } },
    { skill: 'competitor-analysis', action: 'check-competitors', params: { trackMarketing: true } },
    { skill: 'seo-analysis', action: 'audit-seo', params: { depth: 'full' } },
    { skill: 'analytics-reporting', action: 'generate-report', params: { format: 'dashboard' } },
    { skill: 'email-marketing', action: 'prepare-campaign', params: { type: 'newsletter' } },
  ]);
}

export async function recordTransaction(tx: Omit<Transaction, 'id'>): Promise<BusinessResult> {
  return executeBusinessSkill({
    skill: 'budget-tracking',
    action: 'record-transaction',
    params: tx as unknown as Record<string, unknown>,
  });
}
