import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCredentials,
  getCredentials,
  hasGitHubToken,
  saveCredentials,
} from '@/lib/credentials';

describe('credentials store', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns defaults when storage is empty or invalid', async () => {
    expect(await getCredentials()).toEqual({
      githubToken: '',
      vercelToken: '',
      supabaseUrl: '',
      supabaseKey: '',
    });

    localStorage.setItem('ab_credentials_enc_v2', 'corrupt-data');
    expect((await getCredentials()).githubToken).toBe('');
  });

  it('saves and clears credentials while notifying listeners', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    await saveCredentials({
      githubToken: 'ghp_12345678901',
      vercelToken: 'vercel-token',
      supabaseUrl: 'https://example.supabase.co',
      supabaseKey: 'supabase-key',
    });

    expect((await getCredentials()).vercelToken).toBe('vercel-token');

    clearCredentials();

    expect((await getCredentials()).githubToken).toBe('');
    expect(dispatchSpy).toHaveBeenCalledTimes(2);
  });

  it('detects whether a usable github token exists', async () => {
    expect(await hasGitHubToken()).toBe(false);

    await saveCredentials({
      githubToken: 'ghp_1234567890123456789012345678901234567890',
      vercelToken: '',
      supabaseUrl: '',
      supabaseKey: '',
    });

    expect(await hasGitHubToken()).toBe(true);
  });

  it('stored value is not plaintext', async () => {
    await saveCredentials({
      githubToken: 'ghp_secret_token_12345',
      vercelToken: '',
      supabaseUrl: '',
      supabaseKey: '',
    });

    const raw = localStorage.getItem('ab_credentials_enc_v2');
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('ghp_secret_token_12345');
    expect(raw).not.toContain('githubToken');
  });

  it('can round-trip encrypt/decrypt', async () => {
    const creds = {
      githubToken: 'ghp_roundtrip_test',
      vercelToken: 'vercel_abc123',
      supabaseUrl: 'https://project.supabase.co',
      supabaseKey: 'sb_key_xyz',
    };

    await saveCredentials(creds);
    const loaded = await getCredentials();
    expect(loaded).toEqual(creds);
  });

  it('corrupt data returns defaults (no crash)', async () => {
    localStorage.setItem('ab_credentials_enc_v2', '!!!not-valid-base64!!!');
    const result = await getCredentials();
    expect(result.githubToken).toBe('');
  });
});
