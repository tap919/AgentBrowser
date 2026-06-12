import { describe, it, expect } from 'vitest';
import { solveCaptcha, type CaptchaProvider } from '@/lib/captcha-solver';
import { getRotatingProxy, getRandomFingerprint, generateSessionId } from '@/lib/stealth-agent';
import { analyzeScreenshot, extractElementsFromHtml } from '@/lib/vision-agent';

describe('captcha-solver', () => {
  it('returns error when no provider configured', async () => {
    const result = await solveCaptcha('fakebase64', 'none');
    expect(result.success).toBe(false);
    expect(result.error).toContain('No CAPTCHA solver configured');
  });
});

describe('stealth-agent', () => {
  it('generates a session id', () => {
    const id = generateSessionId();
    expect(id).toMatch(/^ab-session-/);
  });

  it('returns random fingerprint', () => {
    const fp = getRandomFingerprint();
    expect(fp.userAgent).toBeTruthy();
    expect(fp.viewport.width).toBeGreaterThan(0);
    expect(fp.locale).toBeTruthy();
    expect(fp.timezone).toBeTruthy();
  });

  it('returns proxy from env if set', () => {
    const proxy = getRotatingProxy(0);
    // Without PROXY_URL set, this returns undefined
    expect(proxy === undefined || (proxy.server && typeof proxy.server === 'string')).toBe(true);
  });
});

describe('vision-agent', () => {
  it('fallback analysis extracts elements from HTML', () => {
    const html = '<html><body><button>Click me</button><a href="/">Home</a><input placeholder="Email"></body></html>';
    const elements = extractElementsFromHtml(html);
    expect(elements.length).toBeGreaterThanOrEqual(3);
    expect(elements.some(e => e.tag === 'button')).toBe(true);
    expect(elements.some(e => e.tag === 'a')).toBe(true);
  });

  it('analyzeScreenshot returns fallback without API key', async () => {
    const result = await analyzeScreenshot({ screenshotBase64: 'fake', prompt: 'Test' });
    expect(result.description).toBeTruthy();
    expect(Array.isArray(result.elements)).toBe(true);
    expect(Array.isArray(result.actionPlan)).toBe(true);
  });
});
