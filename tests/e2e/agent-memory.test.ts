import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE = 'http://localhost:3000';
const API_KEY = process.env.AGENT_API_KEY || 'test-api-key';

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  'X-Agent-Auth': API_KEY,
};

// Skip if no server is running
const isServerRunning = async () => {
  try {
    const res = await fetch(`${BASE}/api/agent-memory?key=ping`, {
      signal: AbortSignal.timeout(2000),
    });
    return true;
  } catch {
    return false;
  }
};

describe('Agent Memory API E2E', () => {
  let serverAvailable = false;

  beforeAll(async () => {
    serverAvailable = await isServerRunning();
  });

  afterAll(async () => {
    // Clean up test data
    if (serverAvailable) {
      await fetch(`${BASE}/api/agent-memory?key=e2e-test-key&namespace=e2e`, {
        method: 'DELETE',
        headers: AUTH_HEADERS,
      });
      await fetch(`${BASE}/api/agent-memory?key=e2e-prefix-1&namespace=e2e`, {
        method: 'DELETE',
        headers: AUTH_HEADERS,
      });
      await fetch(`${BASE}/api/agent-memory?key=e2e-prefix-2&namespace=e2e`, {
        method: 'DELETE',
        headers: AUTH_HEADERS,
      });
    }
  });

  it('requires authentication for write operations', async () => {
    if (!serverAvailable) return;
    const res = await fetch(`${BASE}/api/agent-memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'test', value: 'test' }),
    });
    expect(res.status).toBe(401);
  });

  it('writes and reads a value', async () => {
    if (!serverAvailable) return;
    // Write
    const writeRes = await fetch(`${BASE}/api/agent-memory`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({
        namespace: 'e2e',
        key: 'e2e-test-key',
        value: { message: 'hello e2e' },
        agentId: 'e2e-test',
        ttl: 3600,
      }),
    });
    expect(writeRes.ok).toBe(true);

    // Read
    const readRes = await fetch(`${BASE}/api/agent-memory?key=e2e-test-key&namespace=e2e`);
    expect(readRes.ok).toBe(true);
    const data = await readRes.json();
    expect(data.key).toBe('e2e-test-key');
    expect(data.value).toEqual({ message: 'hello e2e' });
    expect(data.agentId).toBe('e2e-test');
  });

  it('returns 404 for missing keys', async () => {
    if (!serverAvailable) return;
    const res = await fetch(`${BASE}/api/agent-memory?key=nonexistent-e2e&namespace=e2e`);
    expect(res.status).toBe(404);
  });

  it('searches keys by prefix', async () => {
    if (!serverAvailable) return;
    // Write two keys
    await fetch(`${BASE}/api/agent-memory`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ namespace: 'e2e', key: 'e2e-prefix-1', value: 1, agentId: 'e2e' }),
    });
    await fetch(`${BASE}/api/agent-memory`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ namespace: 'e2e', key: 'e2e-prefix-2', value: 2, agentId: 'e2e' }),
    });

    const res = await fetch(`${BASE}/api/agent-memory?prefix=e2e-prefix&namespace=e2e`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.results.length).toBeGreaterThanOrEqual(2);
  });

  it('respects TTL expiry via API', async () => {
    if (!serverAvailable) return;
    // Write with immediate expiry
    const writeRes = await fetch(`${BASE}/api/agent-memory`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ namespace: 'e2e', key: 'e2e-expired', value: 'gone', agentId: 'e2e', ttl: -1 }),
    });
    expect(writeRes.ok).toBe(true);

    // Read should return 404
    const readRes = await fetch(`${BASE}/api/agent-memory?key=e2e-expired&namespace=e2e`);
    expect(readRes.status).toBe(404);
  });

  it('deletes a key', async () => {
    if (!serverAvailable) return;
    // Write
    await fetch(`${BASE}/api/agent-memory`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ namespace: 'e2e', key: 'e2e-to-delete', value: 'temp', agentId: 'e2e' }),
    });

    // Delete
    const delRes = await fetch(`${BASE}/api/agent-memory?key=e2e-to-delete&namespace=e2e`, {
      method: 'DELETE',
      headers: AUTH_HEADERS,
    });
    expect(delRes.ok).toBe(true);
    const delData = await delRes.json();
    expect(delData.deleted).toBe(true);

    // Confirm gone
    const readRes = await fetch(`${BASE}/api/agent-memory?key=e2e-to-delete&namespace=e2e`);
    expect(readRes.status).toBe(404);
  });
});
