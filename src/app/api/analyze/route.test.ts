import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';

describe('POST /api/analyze', () => {
  it('rejects missing required fields', async () => {
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects missing project name', async () => {
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName: '' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects malformed JSON', async () => {
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('generates analysis for valid request', async () => {
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: 'MyApp',
        description: 'A great app',
        type: 'web',
        audience: 'devs',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('analysis');
    expect(data.analysis).toHaveProperty('summary');
    expect(data.analysis).toHaveProperty('techStack');
  });
});
