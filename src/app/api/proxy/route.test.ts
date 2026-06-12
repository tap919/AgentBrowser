import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

// Don't mock net — use the real isIP from Node.js built-in
const { GET } = await import('./route');

function makeRequest(url: string): NextRequest {
  return new NextRequest(new Request(`http://localhost:3000/api/proxy?url=${encodeURIComponent(url)}`));
}

describe('SSRF guard', () => {
  it('blocks 127.0.0.1', async () => {
    const res = await GET(makeRequest('http://127.0.0.1:8888/admin'));
    expect(res.status).toBe(403);
  });

  it('blocks localhost', async () => {
    const res = await GET(makeRequest('http://localhost:3000'));
    expect(res.status).toBe(403);
  });

  it('blocks 0.0.0.0', async () => {
    const res = await GET(makeRequest('http://0.0.0.0:3000'));
    expect(res.status).toBe(403);
  });

  it('blocks [::1]', async () => {
    const res = await GET(makeRequest('http://[::1]:3000'));
    expect(res.status).toBe(403);
  });

  it('blocks private 10.x.x.x', async () => {
    const res = await GET(makeRequest('http://10.0.0.1/admin'));
    expect(res.status).toBe(403);
  });

  it('blocks private 192.168.x.x', async () => {
    const res = await GET(makeRequest('http://192.168.1.1/admin'));
    expect(res.status).toBe(403);
  });

  it('blocks URL with embedded credentials', async () => {
    const res = await GET(makeRequest('http://user:pass@evil.com'));
    expect(res.status).toBe(403);
  });

  it('handles malformed URL gracefully', async () => {
    const res = await GET(makeRequest('not a url'));
    expect(res.status).toBe(400);
  });

  it('rejects no url param', async () => {
    const req = new NextRequest(new Request('http://localhost:3000/api/proxy'));
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('rejects non-http protocol', async () => {
    const res = await GET(makeRequest('ftp://example.com'));
    expect(res.status).toBe(400);
  });
});
