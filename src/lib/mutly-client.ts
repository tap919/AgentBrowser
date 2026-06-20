const MUTLY_URL = process.env.MUTLY_URL || 'http://localhost:4000';
const MUTLY_API_KEY = process.env.AGENT_API_KEY || '';

function mutlyHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(MUTLY_API_KEY ? { 'X-Mutly-API-Key': MUTLY_API_KEY } : {}),
  };
}

export async function checkMutlyHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${MUTLY_URL}/api/health`, {
      headers: mutlyHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (err) {
    console.error('[mutly-client] checkMutlyHealth failed', err);
    return false;
  }
}

export async function startPipeline(projectDir?: string): Promise<{ pipelineId: string; status: string } | { error: string }> {
  try {
    const response = await fetch(`${MUTLY_URL}/api/pipeline/start`, {
      method: 'POST',
      headers: mutlyHeaders(),
      body: JSON.stringify({ projectDir }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { error: body.error || `Mutly responded with ${response.status}` };
    }
    return await response.json();
  } catch (err) {
    return { error: `Mutly unreachable: ${err instanceof Error ? err.message : 'Unknown'}` };
  }
}

export async function getPipelineStatus(pipelineId: string): Promise<{ success: boolean; pipeline: unknown } | { error: string }> {
  try {
    const response = await fetch(`${MUTLY_URL}/api/pipeline/status/${pipelineId}`, {
      headers: mutlyHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      if (response.status === 404) return { error: 'Pipeline not found' };
      return { error: `Mutly responded with ${response.status}` };
    }
    return await response.json();
  } catch (err) {
    return { error: `Mutly unreachable: ${err instanceof Error ? err.message : 'Unknown'}` };
  }
}

export async function getLatestPipelineStatus(): Promise<{ success: boolean; pipeline: unknown | null; status: string } | { error: string }> {
  try {
    const response = await fetch(`${MUTLY_URL}/api/pipeline/status`, {
      headers: mutlyHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { error: `Mutly responded with ${response.status}` };
    return await response.json();
  } catch (err) {
    return { error: `Mutly unreachable: ${err instanceof Error ? err.message : 'Unknown'}` };
  }
}
