import { searchBooks, type BookSearchHit } from '@/lib/books';
import { getCodingSkill, type CodingSkillId } from './skills';

export interface CodingToolCommand {
  skill: CodingSkillId;
  query?: string;
  limit?: number;
  params?: Record<string, unknown>;
}

export interface CodingToolResult {
  success: boolean;
  skill: CodingSkillId;
  results: BookSearchHit[];
  duration: number;
  query: string;
  error?: string;
}

export async function executeCodingTool(command: CodingToolCommand): Promise<CodingToolResult> {
  const start = Date.now();
  const skill = getCodingSkill(command.skill);

  if (!skill) {
    return {
      success: false,
      skill: command.skill,
      results: [],
      duration: 0,
      query: '',
      error: `Unknown coding skill: ${command.skill}`,
    };
  }

  try {
    const query = command.query || skill.defaultQuery;
    const limit = command.limit || (skill.config.maxResults as number) || 5;
    const category = command.params?.category as string || skill.config.category as string || 'Computers';

    const results = await searchBooks(query, { category, limit });

    return {
      success: true,
      skill: command.skill,
      results,
      duration: Date.now() - start,
      query,
    };
  } catch (err: unknown) {
    return {
      success: false,
      skill: command.skill,
      results: [],
      duration: Date.now() - start,
      query: command.query || skill.defaultQuery,
      error: err instanceof Error ? err.message : 'Coding tool execution failed',
    };
  }
}

export async function executeMultipleCodingTools(
  commands: CodingToolCommand[],
): Promise<CodingToolResult[]> {
  const results: CodingToolResult[] = [];
  for (const cmd of commands) {
    results.push(await executeCodingTool(cmd));
  }
  return results;
}

export async function runCodeReviewChecklist(params?: Record<string, unknown>): Promise<CodingToolResult> {
  return executeCodingTool({
    skill: 'code-review-assistant',
    query: (params?.topic as string) || 'code review checklist testing best practices',
    limit: (params?.count as number) || 5,
    params,
  });
}

export async function runTypeScriptPatterns(params?: Record<string, unknown>): Promise<CodingToolResult> {
  return executeCodingTool({
    skill: 'ts-react-patterns',
    query: (params?.topic as string) || 'TypeScript types React components Next.js hooks patterns',
    limit: (params?.count as number) || 5,
    params,
  });
}

export async function runPythonAdvice(params?: Record<string, unknown>): Promise<CodingToolResult> {
  return executeCodingTool({
    skill: 'python-best-practices',
    query: (params?.topic as string) || 'Python modules testing performance clean code',
    limit: (params?.count as number) || 5,
    params,
  });
}

export async function runSecurityAudit(params?: Record<string, unknown>): Promise<CodingToolResult> {
  return executeCodingTool({
    skill: 'security-patterns',
    query: (params?.topic as string) || 'security vulnerability authentication encryption scanning',
    limit: (params?.count as number) || 5,
    params,
  });
}

export async function runDistributedSystemsAdvice(params?: Record<string, unknown>): Promise<CodingToolResult> {
  return executeCodingTool({
    skill: 'distributed-systems',
    query: (params?.topic as string) || 'distributed systems replication partitioning consistency',
    limit: (params?.count as number) || 5,
    params,
  });
}
