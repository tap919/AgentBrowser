import { test, expect } from '@playwright/test';

const API_KEY = process.env.AGENT_API_KEY || 'test-api-key';

test.describe('Browser Task API E2E', () => {
  test.setTimeout(30000);

  test('rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post(`/api/browser-task`, {
      data: { action: 'reader', url: 'https://example.com' },
    });
    // 401 = API key rejected, 503 = API key not configured
    expect([401, 503]).toContain(res.status());
  });

  test('rejects invalid file:// URLs', async ({ request }) => {
    const res = await request.post(`/api/browser-task`, {
      headers: { 'X-Agent-Auth': API_KEY },
      data: { action: 'reader', url: 'file:///etc/passwd' },
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('http');
    } else {
      // Auth might fail if server doesn't have API key
      expect(res.status()).toBe(503);
    }
  });

  test('fetches page content for reader action', async ({ request }) => {
    const res = await request.post(`/api/browser-task`, {
      headers: { 'X-Agent-Auth': API_KEY },
      data: { action: 'reader', url: 'https://example.com' },
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.content).toBeTruthy();
      expect(body.content.length).toBeGreaterThan(10);
    } else {
      expect(res.status()).toBe(503);
    }
  });
});
