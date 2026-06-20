const REPORANK_URL = process.env.REPORANK_URL || 'http://localhost:3001';
const REPORANK_API_KEY = process.env.REPORANK_API_KEY || '';

function reporankHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (REPORANK_API_KEY) headers['Authorization'] = REPORANK_API_KEY.startsWith('gr_') ? REPORANK_API_KEY : `gr_${REPORANK_API_KEY}`;
  return headers;
}

export async function checkReporankHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${REPORANK_URL}/api/health`, {
      headers: reporankHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function analyzeRepo(repoUrl: string, branch = 'main'): Promise<{ scanId: string; status: string } | { error: string }> {
  try {
    const response = await fetch(`${REPORANK_URL}/api/scans`, {
      method: 'POST',
      headers: reporankHeaders(),
      body: JSON.stringify({ repoUrl, branch }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { error: body.error || `RepoRank responded with ${response.status}` };
    }
    const raw = await response.json();
    const data = raw.data || raw;
    return { scanId: data.scanId, status: data.status };
  } catch (err) {
    return { error: `RepoRank unreachable: ${err instanceof Error ? err.message : 'Unknown'}` };
  }
}

export async function getRank(repoUrl: string, branch = 'main'): Promise<{ rank?: number; score?: number; summary?: string; error?: string }> {
  const analysis = await analyzeRepo(repoUrl, branch);
  if ('error' in analysis) return { error: analysis.error };
  const status = await getScanStatus(analysis.scanId);
  if ('error' in status) return { error: status.error };
  if (status.status === 'completed') {
    const r = (status.result || {}) as Record<string, unknown>;
    return { rank: r.rank as number, score: r.score as number, summary: r.summary as string };
  }
  return { error: `Scan ${status.status} — try again later` };
}

export async function getScanStatus(scanId: string): Promise<{ status: string; result?: unknown } | { error: string }> {
  try {
    const response = await fetch(`${REPORANK_URL}/api/scans/${scanId}`, {
      headers: reporankHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { error: `RepoRank responded with ${response.status}` };
    const raw = await response.json();
    const data = raw.data || raw;
    return { status: data.status, result: data.result || data };
  } catch (err) {
    return { error: `RepoRank unreachable: ${err instanceof Error ? err.message : 'Unknown'}` };
  }
}
