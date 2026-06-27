/**
 * Overlay 365 Cross-Service Orchestrator
 * Coordinates workflows across Aetherdesk, Jobclaw, Blocklabor, Claw Protect, Big Homie
 */

const AETHERDESK_URL = process.env.AETHERDESK_URL || 'http://localhost:8000';
const JOBCLAW_URL = process.env.JOBCLAW_URL || 'http://localhost:3000';
const BLOCKLABOR_URL = process.env.BLOCKLABOR_URL || 'http://localhost:5173';
const REQUEST_TIMEOUT_MS = parseInt(process.env.OVERLAY_TIMEOUT_MS || '15000', 10);
const MAX_RETRIES = 3;

export type OverlayService = 'aetherdesk' | 'jobclaw' | 'blocklabor' | 'agent-browser';

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

/**
 * Retry helper for transient failures.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        // Exponential backoff: 100ms, 200ms, 400ms
        await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastError || new Error('Retry failed');
}

/**
 * Execute a workflow across Overlay 365 services.
 * Each step runs with retry. If a step fails, subsequent steps are not executed.
 */
export async function executeWorkflow(workflow: OverlayWorkflow): Promise<WorkflowResult> {
  const requestId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const results: Array<{ step: string; result: unknown; error?: string }> = [];

  for (const step of workflow.steps) {
    try {
      let result: unknown;
      const stepResult = await withRetry(async () => {
        switch (step.service) {
          case 'aetherdesk':
            return await callAetherdesk(step.action, step.params, requestId);
          case 'jobclaw':
            return await callJobclaw(step.action, step.params, requestId);
          case 'blocklabor':
            return await callBlocklabor(step.action, step.params, requestId);
          case 'agent-browser':
            return { service: 'agent-browser', action: step.action, status: 'local' };
          default:
            throw new Error(`Unknown service: ${step.service}`);
        }
      });
      result = stepResult;
      results.push({ step: `${step.service}.${step.action}`, result });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      results.push({
        step: `${step.service}.${step.action}`,
        result: null,
        error,
      });
      return {
        workflow: workflow.name,
        results,
        success: false,
        error: `Step ${step.service}.${step.action} failed: ${error}`,
      };
    }
  }
  return { workflow: workflow.name, results, success: true };
}

async function callAetherdesk(
  action: string,
  params: Record<string, unknown>,
  requestId: string,
): Promise<unknown> {
  return callService(`${AETHERDESK_URL}/api/v1/${action}`, params, requestId);
}

async function callJobclaw(
  action: string,
  params: Record<string, unknown>,
  requestId: string,
): Promise<unknown> {
  return callService(`${JOBCLAW_URL}/api/${action}`, params, requestId);
}

async function callBlocklabor(
  action: string,
  params: Record<string, unknown>,
  requestId: string,
): Promise<unknown> {
  return callService(`${BLOCKLABOR_URL}/api/${action}`, params, requestId);
}

async function callService(
  url: string,
  params: Record<string, unknown>,
  requestId: string,
): Promise<unknown> {
  // Validate URL to prevent SSRF
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid URL protocol');
    }
  } catch {
    throw new Error(`Invalid service URL: ${url}`);
  }

  // Validate params don't contain prototype pollution
  const safeParams = JSON.parse(JSON.stringify(params));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'X-Overlay-Platform': 'agent-browser',
    },
    body: JSON.stringify(safeParams),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Service returned ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Non-JSON response from service`);
  }

  return response.json();
}

/**
 * Pre-built workflow: "Hire a worker when call volume spikes"
 */
export async function hireWorkerOnCallSpike(tenantId: string): Promise<WorkflowResult> {
  if (!tenantId || typeof tenantId !== 'string') {
    return {
      workflow: 'hire-on-call-spike',
      results: [],
      success: false,
      error: 'Invalid tenantId',
    };
  }
  return executeWorkflow({
    name: 'hire-on-call-spike',
    steps: [
      {
        service: 'aetherdesk',
        action: 'analytics/call-volume',
        params: { tenant_id: tenantId, period: 'last_hour' },
      },
      {
        service: 'blocklabor',
        action: 'blocklabor/workers/match',
        params: { skills: 'customer-service', min_pay: 20 },
      },
    ],
  });
}

/**
 * Pre-built workflow: "Screen and onboard a new worker"
 */
export async function screenAndOnboardWorker(applicationId: string): Promise<WorkflowResult> {
  if (!applicationId || typeof applicationId !== 'string') {
    return {
      workflow: 'screen-onboard-worker',
      results: [],
      success: false,
      error: 'Invalid applicationId',
    };
  }
  return executeWorkflow({
    name: 'screen-onboard-worker',
    steps: [
      {
        service: 'jobclaw',
        action: 'gemini/audit-profile',
        params: { application_id: applicationId },
      },
      {
        service: 'blocklabor',
        action: 'workers/create-profile',
        params: { application_id: applicationId },
      },
    ],
  });
}