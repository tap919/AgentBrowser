// Shared API client with auth headers for all service-hub calls.
// Uses the same AGENT_API_KEY across Mutly, VibeServe, and RepoRank.
//
// SECURITY NOTE: NEXT_PUBLIC_AGENT_API_KEY is embedded in the client bundle.
// This is a dev-only shortcut. In production, auth should be handled
// server-side (e.g. session cookies or server-side proxy). The key here
// only gates POST mutations on the local dev network — it is not a
// production auth mechanism.

const API_KEY = typeof process !== 'undefined'
  ? (process.env.NEXT_PUBLIC_AGENT_API_KEY || '')
  : '';

function getAuthHeaders(): Record<string, string> {
  return API_KEY ? { 'X-Agent-Auth': API_KEY } : {};
}

export async function apiPost(url: string, body: unknown, timeout = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** Returns true if the auth key is configured. Does NOT return the key itself. */
export function isAuthConfigured(): boolean {
  return API_KEY.length > 0;
}
