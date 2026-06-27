/**
 * Overlay 365 Cross-Service Orchestrator
 * Coordinates workflows across Aetherdesk, Jobclaw, Blocklabor, Claw Protect, Mutly, VibeServe.
 *
 * Routes through service-hub.ts for each downstream call, which handles
 * Mutly gateway fallback, health checks, and auth. This file focuses on
 * workflow composition and pre-built labor-exchange flows.
 */
import {
  checkAllServices,
  listOpenJobs,
  listWorkerProfiles,
  rankWorkersForJob,
  requestBusinessIdentityVerification,
  requestGhostJobAudit,
  requestApplicationSlaAlert,
  getWorkerProfile,
  getJobPosting,
  callMutlyApi,
  executeVibeServeTool,
} from '@/lib/service-hub';

type OverlayService = 'aetherdesk' | 'jobclaw' | 'blocklabor' | 'agent-browser';

const AETHERDESK_URL = process.env.AETHERDESK_URL || 'http://localhost:8000';
const JOBCLAW_URL = process.env.JOBCLAW_URL || 'http://localhost:3000';
const REQUEST_TIMEOUT_MS = parseInt(process.env.OVERLAY_TIMEOUT_MS || '15000', 10);
const MAX_RETRIES = 3;

export interface WorkflowStep {
  service: OverlayService;
  action: string;
  params: Record<string, unknown>;
}

export interface OverlayWorkflow {
  name: string;
  steps: WorkflowStep[];
}

export interface WorkflowResult {
  workflow: string;
  results: Array<{ step: string; result: unknown; error?: string }>;
  success: boolean;
  error?: string;
}

// ─── Retry ──────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastError || new Error('Retry failed');
}

// ─── Generic Service Router ─────────────────────────────────────
// Falls back to raw HTTP when service-hub functions don't cover an action.

async function callAetherdesk(
  action: string,
  params: Record<string, unknown>,
  _requestId: string,
): Promise<unknown> {
  const url = `${AETHERDESK_URL}/api/v1/${action}`;
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Invalid URL protocol');
  }
  const safeParams = JSON.parse(JSON.stringify(params));
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Overlay-Platform': 'agent-browser',
    },
    body: JSON.stringify(safeParams),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Aetherdesk ${action}: ${response.status}`);
  return response.json();
}

async function callJobclaw(
  action: string,
  params: Record<string, unknown>,
  _requestId: string,
): Promise<unknown> {
  const url = `${JOBCLAW_URL}/api/${action}`;
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Invalid URL protocol');
  }
  const safeParams = JSON.parse(JSON.stringify(params));
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Overlay-Platform': 'agent-browser',
    },
    body: JSON.stringify(safeParams),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Jobclaw ${action}: ${response.status}`);
  return response.json();
}

/**
 * Route BlockLabor actions through service-hub (Mutly gateway + direct fallback).
 */
async function callBlocklabor(
  action: string,
  params: Record<string, unknown>,
  _requestId: string,
): Promise<unknown> {
  // Map action names to service-hub functions
  switch (action) {
    case 'jobs/list':
      return listOpenJobs(params as Record<string, unknown>);
    case 'jobs/get':
      return getJobPosting(String(params.jobId));
    case 'jobs/rank':
      return rankWorkersForJob(String(params.jobId), params.topK as number);
    case 'workers/list':
      return listWorkerProfiles(params as Record<string, unknown>);
    case 'workers/get':
      return getWorkerProfile(String(params.workerId));
    case 'verification/business-identity':
      return requestBusinessIdentityVerification(params as any);
    case 'verification/ghost-job-audit':
      return requestGhostJobAudit(params as any);
    case 'verification/application-sla-breach':
      return requestApplicationSlaAlert(params as any);
    default:
      throw new Error(`Unknown BlockLabor action: ${action}`);
  }
}

/**
 * Route AgentBrowser-local actions.
 */
async function callAgentBrowser(
  action: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  switch (action) {
    case 'service-health':
      return checkAllServices();
    case 'mutly-pipeline':
      return callMutlyApi('/api/pipeline/start', 'POST', params);
    case 'vibeserve-tool':
      return executeVibeServeTool(String(params.tool), params.params as Record<string, unknown>);
    default:
      return { service: 'agent-browser', action, status: 'local' };
  }
}

// ─── Workflow Executor ──────────────────────────────────────────

export async function executeWorkflow(workflow: OverlayWorkflow): Promise<WorkflowResult> {
  const requestId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const results: Array<{ step: string; result: unknown; error?: string }> = [];

  for (const step of workflow.steps) {
    try {
      const result = await withRetry(async () => {
        switch (step.service) {
          case 'aetherdesk':
            return callAetherdesk(step.action, step.params, requestId);
          case 'jobclaw':
            return callJobclaw(step.action, step.params, requestId);
          case 'blocklabor':
            return callBlocklabor(step.action, step.params, requestId);
          case 'agent-browser':
            return callAgentBrowser(step.action, step.params);
          default:
            throw new Error(`Unknown service: ${step.service}`);
        }
      });
      results.push({ step: `${step.service}.${step.action}`, result });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      results.push({ step: `${step.service}.${step.action}`, result: null, error });
      return { workflow: workflow.name, results, success: false, error: `Step failed: ${error}` };
    }
  }
  return { workflow: workflow.name, results, success: true };
}

// ─── Pre-built Labor Exchange Workflows ─────────────────────────

/**
 * Screen + onboard a new worker: audit profile via Jobclaw, then create BlockLabor profile.
 */
export async function screenAndOnboardWorker(applicationId: string): Promise<WorkflowResult> {
  if (!applicationId) return { workflow: 'screen-onboard-worker', results: [], success: false, error: 'Invalid applicationId' };
  return executeWorkflow({
    name: 'screen-onboard-worker',
    steps: [
      { service: 'jobclaw', action: 'gemini/audit-profile', params: { application_id: applicationId } },
      { service: 'blocklabor', action: 'workers/create-profile', params: { application_id: applicationId } },
    ],
  });
}

/**
 * Hire a worker when call volume spikes: query Aetherdesk analytics, then match BlockLabor workers.
 */
export async function hireWorkerOnCallSpike(tenantId: string): Promise<WorkflowResult> {
  if (!tenantId) return { workflow: 'hire-on-call-spike', results: [], success: false, error: 'Invalid tenantId' };
  return executeWorkflow({
    name: 'hire-on-call-spike',
    steps: [
      { service: 'aetherdesk', action: 'analytics/call-volume', params: { tenant_id: tenantId, period: 'last_hour' } },
      { service: 'blocklabor', action: 'workers/list', params: { vertical: 'customer-service', status: 'active' } },
    ],
  });
}

/**
 * Daily ghost-job audit: list stale jobs, trigger Aetherdesk verification calls for each.
 */
export async function dailyGhostJobAudit(tenantId: string): Promise<WorkflowResult> {
  const jobs = await listOpenJobs({ status: 'open' }) as { jobs?: Array<{ id: string; title: string; business_name?: string }> };
  const staleJobs = (jobs.jobs ?? []).slice(0, 10);
  if (staleJobs.length === 0) {
    return { workflow: 'daily-ghost-job-audit', results: [{ step: 'find-stale', result: { count: 0 } }], success: true };
  }
  const steps: WorkflowStep[] = staleJobs.map((job) => ({
    service: 'blocklabor' as OverlayService,
    action: 'verification/ghost-job-audit',
    params: { jobId: job.id, businessPhone: '', jobTitle: job.title, tenantId },
  }));
  return executeWorkflow({ name: 'daily-ghost-job-audit', steps });
}

/**
 * Verify a new business identity: trigger Aetherdesk call.
 */
export async function verifyNewBusiness(payload: {
  businessName: string;
  businessPhone: string;
  businessEin: string;
  businessState: string;
  tenantId: string;
}): Promise<WorkflowResult> {
  return executeWorkflow({
    name: 'verify-new-business',
    steps: [
      { service: 'blocklabor', action: 'verification/business-identity', params: payload },
    ],
  });
}

/**
 * Check ecosystem health: ping all services.
 */
export async function checkEcosystemHealth(): Promise<WorkflowResult> {
  return executeWorkflow({
    name: 'ecosystem-health',
    steps: [
      { service: 'agent-browser', action: 'service-health', params: {} },
    ],
  });
}