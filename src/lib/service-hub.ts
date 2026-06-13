import { agentEventBus } from '@/lib/agent-event-bus';

// Shared API key used across all services.
// Set via AGENT_API_KEY env var — must match MUTLY_API_KEY.
const MASTER_API_KEY = typeof process !== 'undefined' ? (process.env.AGENT_API_KEY || '') : '';

export interface ServiceDefinition {
  id: string;
  name: string;
  type: 'mutly' | 'vibeserve' | 'reporank';
  port: number;
  healthEndpoint: string;
  apiKey?: string;
  status: 'unknown' | 'running' | 'stopped' | 'error';
  capabilities: string[];
}

function populateApiKey(svc: Omit<ServiceDefinition, 'apiKey'> & { apiKey?: string }): ServiceDefinition {
  return { ...svc, apiKey: svc.apiKey ?? (MASTER_API_KEY || undefined) };
}

// Mutly is the primary gateway. VibeServe (8000) and RepoRank (3001) are
// routed through Mutly's proxy endpoints when Mutly is reachable.
// Direct ports are kept as fallback for health checks.
export const SERVICES: ServiceDefinition[] = [
  populateApiKey({
    id: 'mutly',
    name: 'Mutly Daemon Agent',
    type: 'mutly',
    port: 3030,
    healthEndpoint: '/api/health',
    status: 'unknown',
    capabilities: ['pipeline', 'build', 'code-review', 'autonomous-loop', 'drift-detection', 'approval-gates'],
  }),
  populateApiKey({
    id: 'vibeserve',
    name: 'VibeServe',
    type: 'vibeserve',
    port: 8000,
    healthEndpoint: '/api/vibeserve/health',
    status: 'unknown',
    capabilities: ['mcp-tools', 'llm-routing', 'memory', 'task-classification', 'rate-limiting', 'providers'],
  }),
  populateApiKey({
    id: 'reporank',
    name: 'RepoRank',
    type: 'reporank',
    port: 3001,
    healthEndpoint: '/api/reporank/health',
    status: 'unknown',
    capabilities: ['project-scoring', 'quality-audit', 'code-analysis', 'task-generation'],
  }),
];

export interface ServiceStatus {
  id: string;
  running: boolean;
  version?: string;
  error?: string;
}

// ─── Health Checks ───

export async function checkServiceHealth(service: ServiceDefinition): Promise<ServiceStatus> {
  try {
    // Route health checks through Mutly gateway for vibeserve and reporank
    const mutly = SERVICES.find(s => s.id === 'mutly');
    if (mutly && service.id !== 'mutly' && mutly.status === 'running') {
      const gwUrl = `http://127.0.0.1:${mutly.port}${service.healthEndpoint}`;
      const gwRes = await fetch(gwUrl, { signal: AbortSignal.timeout(5000) }).catch(() => null);
      if (gwRes?.ok) {
        const body = await gwRes.json().catch(() => ({}));
        const reachable = body.reachable !== false;
        service.status = reachable ? 'running' : 'stopped';
        return { id: service.id, running: reachable };
      }
    }
    // Fallback: direct health check
    const url = `http://127.0.0.1:${service.port}${service.healthEndpoint}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    service.status = res.ok ? 'running' : 'error';
    return { id: service.id, running: res.ok };
  } catch (err: unknown) {
    service.status = 'stopped';
    return { id: service.id, running: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
}

export async function checkAllServices(): Promise<ServiceStatus[]> {
  return Promise.all(SERVICES.map(checkServiceHealth));
}

// ─── Mutly Integration (Primary Gateway) ───

export function requireService(id: string): ServiceDefinition {
  const svc = SERVICES.find(s => s.id === id);
  if (!svc) throw new Error(`Service '${id}' not found in registry`);
  return svc;
}

export async function callMutlyApi(endpoint: string, method = 'GET', body?: unknown): Promise<unknown> {
  const mutly = requireService('mutly');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (mutly.apiKey) headers['X-Mutly-API-Key'] = mutly.apiKey;

  const url = `http://127.0.0.1:${mutly.port}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Mutly API error: ${res.status}`);
  return res.json();
}

export async function runMutlyPipeline(projectDir?: string): Promise<unknown> {
  return callMutlyApi('/api/pipeline/start', 'POST', { projectDir });
}

export async function getMutlyPipelineStatus(): Promise<unknown> {
  return callMutlyApi('/api/pipeline/status');
}

// ─── VibeServe Integration (routed through Mutly gateway) ───

export async function executeVibeServeTool(tool: string, params: Record<string, unknown>): Promise<unknown> {
  try {
    const mutly = requireService('mutly');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (mutly.apiKey) headers['X-Mutly-API-Key'] = mutly.apiKey;
    const res = await fetch(`http://127.0.0.1:${mutly.port}/api/vibeserve/tools/${tool}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(30000),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `VibeServe via Mutly: ${res.status}`);
    return body.result ?? body;
  } catch (err: unknown) {
    // Fallback: direct VibeServe call
    const vs = requireService('vibeserve');
    const directRes = await fetch(`http://127.0.0.1:${vs.port}/tools/${tool}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000),
    });
    if (!directRes.ok) throw new Error(`VibeServe direct error: ${directRes.status}`);
    return directRes.json();
  }
}

export async function getVibeServeTools(): Promise<unknown> {
  try {
    return await executeVibeServeTool('vs_health', {});
  } catch {
    return { error: 'VibeServe not reachable' };
  }
}

// ─── RepoRank Integration (routed through Mutly gateway) ───

export async function rankProject(projectPath: string): Promise<unknown> {
  try {
    const mutly = requireService('mutly');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (mutly.apiKey) headers['X-Mutly-API-Key'] = mutly.apiKey;
    const res = await fetch(`http://127.0.0.1:${mutly.port}/api/reporank/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ path: projectPath, repoName: projectPath.split(/[/\\]/).pop() || 'project', privateMode: true }),
      signal: AbortSignal.timeout(60000),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `RepoRank via Mutly: ${res.status}`);

    // Normalize response: Mutly proxy wraps in { success, result }
    const scanData = body.result?.data || body.result || body;
    return {
      score: scanData.result?.overallScore ?? 50,
      quality: scanData.result?.gradeCategory ?? 'unknown',
      issues: scanData.result?.findings?.map((f: any) => f.title) ?? [],
    };
  } catch {
    // Fallback: direct RepoRank call
    const rr = requireService('reporank');
    const directRes = await fetch(`http://127.0.0.1:${rr.port}/api/v1/scans/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: projectPath }),
      signal: AbortSignal.timeout(30000),
    });
    if (!directRes.ok) throw new Error(`RepoRank direct error: ${directRes.status}`);
    const directData = await directRes.json();
    return {
      score: directData.result?.overallScore ?? 50,
      quality: directData.result?.gradeCategory ?? 'unknown',
      issues: directData.result?.findings?.map((f: any) => f.title) ?? [],
    };
  }
}

// ─── Full RepoRank API (briefs, milestones, gates, drift) ───

async function callReporank(method: string, endpoint: string, body?: unknown, timeout = 15000): Promise<unknown> {
  // Try via Mutly gateway first
  try {
    const mutly = requireService('mutly');
    const mutlyPath = `/api/reporank${endpoint}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (mutly.apiKey) headers['X-Mutly-API-Key'] = mutly.apiKey;
    const res = await fetch(`http://127.0.0.1:${mutly.port}${mutlyPath}`, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Mutly proxy: ${res.status}`);
    // Mutly wraps in { success, result }
    return data.result ?? data;
  } catch {
    // Fallback: direct RepoRank call
    const rr = requireService('reporank');
    const rrPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullPath = `/api/v1${rrPath}`;
    const directHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (rr.apiKey) directHeaders['X-Mutly-Key'] = rr.apiKey;
    const directRes = await fetch(`http://127.0.0.1:${rr.port}${fullPath}`, {
      method, headers: directHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout),
    });
    if (!directRes.ok) throw new Error(`RepoRank direct: ${directRes.status}`);
    return directRes.json();
  }
}

export async function createRepoBrief(data: Record<string, unknown>): Promise<unknown> {
  return callReporank('POST', '/briefs', data, 15000);
}

export async function listRepoBriefs(): Promise<unknown> {
  return callReporank('GET', '/briefs', undefined, 10000);
}

export async function getRepoBrief(id: string): Promise<unknown> {
  return callReporank('GET', `/briefs/${id}`, undefined, 10000);
}

export async function createRepoMilestone(data: Record<string, unknown>): Promise<unknown> {
  return callReporank('POST', '/milestones', data, 15000);
}

export async function listRepoMilestones(projectId: string): Promise<unknown> {
  return callReporank('GET', `/milestones/project/${projectId}`, undefined, 10000);
}

export async function evaluateRepoGate(gateId: string, data: Record<string, unknown>): Promise<unknown> {
  return callReporank('POST', `/gates/${gateId}/evaluate`, data, 15000);
}

export async function runRepoDrift(projectId: string, data?: Record<string, unknown>): Promise<unknown> {
  return callReporank('POST', `/drift/${projectId}`, data, 30000);
}

export async function getFullScanResult(scanId: string): Promise<unknown> {
  return callReporank('GET', `/scan/${scanId}`, undefined, 10000);
}

// ─── Unified Pipeline: RepoRank → Mutly → AgentBrowser ───

export async function preBuildAudit(projectName: string, projectPath: string): Promise<{
  rank: { score: number; quality: string; issues: string[] };
  plan?: unknown;
}> {
  const result: { score: number; quality: string; issues: string[] } = { score: 0, quality: 'unknown', issues: [] };

  // 1. Try RepoRank first
  try {
    const rankResult = await rankProject(projectPath) as { score?: number; quality?: string; issues?: string[] };
    result.score = rankResult.score ?? 0;
    result.quality = rankResult.quality ?? 'unknown';
    result.issues = rankResult.issues ?? [];
  } catch {
    // Fallback to local analysis
    const { analyzeProjectSync } = await import('@/lib/project-automation');
    const analysis = analyzeProjectSync(projectName, projectPath);
    result.score = analysis.reporank.score;
    result.quality = analysis.reporank.quality;
    result.issues = analysis.reporank.issues;
  }

  // 2. If quality is good, optionally trigger Mutly pipeline
  let plan: unknown;
  if (result.score >= 50) {
    try {
      plan = await runMutlyPipeline(projectPath);
      agentEventBus.emit('artifact', 'service-hub', {
        type: 'mutly-pipeline-triggered',
        project: projectName,
        score: result.score,
      }, true);
    } catch {
      // Mutly not running — skip
    }
  }

  // 3. Store audit in memory for later use
  try {
    const { writeMemory } = await import('@/lib/agent-memory');
    await writeMemory({
      namespace: 'prebuild-audits',
      key: `audit:${projectName}:${Date.now()}`,
      value: { project: projectName, path: projectPath, rank: result, plan },
      agentId: 'service-hub',
      ttl: 86400,
    });
  } catch { /* non-critical */ }

  return { rank: result, plan };
}

export async function searchBooks(query: string, category?: string, limit?: number): Promise<unknown> {
  try {
    const { searchBooks: search } = await import('@/lib/books');
    return search(query, { category, limit });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Book search failed';
    return { error: msg };
  }
}

export async function getBookCatalog(): Promise<unknown> {
  try {
    const { getCatalog } = await import('@/lib/books');
    return getCatalog();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to read catalog';
    return { error: msg };
  }
}
