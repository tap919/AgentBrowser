const VIBESERVE_URL = process.env.VIBESERVE_URL || 'http://localhost:8000';
const VIBESERVE_API_KEY = process.env.VIBESERVE_API_KEY || '';
const MUTLY_URL = process.env.MUTLY_URL || 'http://localhost:4000';
const MUTLY_API_KEY = process.env.AGENT_API_KEY || '';

function vibeserveHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (VIBESERVE_API_KEY) headers['Authorization'] = `Bearer ${VIBESERVE_API_KEY}`;
  return headers;
}

function mutlyHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (MUTLY_API_KEY) headers['X-Mutly-API-Key'] = MUTLY_API_KEY;
  return headers;
}

/** Check VibeServe health directly */
export async function checkVibeServeHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${VIBESERVE_URL}/api/v1/health`, {
      headers: vibeserveHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Call a VibeServe tool — direct first, fallback to Mutly proxy */
export async function callVibeServeTool(toolName: string, args: Record<string, unknown> = {}): Promise<{ success: boolean; result: unknown } | { success: boolean; error: string }> {
  // Try direct VibeServe call first
  try {
    const response = await fetch(`${VIBESERVE_URL}/api/v1/tools/${toolName}`, {
      method: 'POST',
      headers: vibeserveHeaders(),
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(15000),
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, result: data };
    }
    // HTTP error — don't fall through, return the error
    if (response.status >= 400 && response.status < 500) {
      return { success: false, error: `VibeServe returned ${response.status}` };
    }
    // Server error — try fallback
  } catch {
    // Network error — fall through to Mutly proxy
  }

  // Fallback: call via Mutly proxy
  try {
    const response = await fetch(`${MUTLY_URL}/api/vibeserve/tools/${toolName}`, {
      method: 'POST',
      headers: mutlyHeaders(),
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(15000),
    });
    if (response.ok) {
      const data = await response.json();
      return data.success ? { success: true, result: data.result } : { success: false, error: data.error || 'Mutly proxy failed' };
    }
    return { success: false, error: `Mutly responded with ${response.status}` };
  } catch (err) {
    return { success: false, error: `VibeServe direct and Mutly fallback both unreachable: ${err instanceof Error ? err.message : 'Unknown'}` };
  }
}

/** List available VibeServe tools */
export async function listVibeServeTools(): Promise<{ success: boolean; tools: unknown[] } | { success: boolean; error: string }> {
  try {
    const response = await fetch(`${VIBESERVE_URL}/api/v1/tools`, {
      headers: vibeserveHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, tools: Array.isArray(data) ? data : data.tools || [] };
    }
  } catch {
    // fallback to Mutly proxy
  }
  try {
    const response = await fetch(`${MUTLY_URL}/api/vibeserve/health`, {
      headers: mutlyHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, tools: data.result?.availableTools || [] };
    }
    return { success: false, error: 'VibeServe unreachable' };
  } catch {
    return { success: false, error: 'VibeServe and Mutly fallback both unreachable' };
  }
}
