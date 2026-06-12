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

  it('returns defaults when storage is empty or invalid', () => {
    expect(getCredentials()).toEqual({
      githubToken: '',
      vercelToken: '',
      supabaseUrl: '',
      supabaseKey: '',
    });

    localStorage.setItem('ab_credentials_enc', 'corrupt-data');
    expect(getCredentials().githubToken).toBe('');
  });

  it('saves and clears credentials while notifying listeners', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    saveCredentials({
      githubToken: 'ghp_12345678901',
      vercelToken: 'vercel-token',
      supabaseUrl: 'https://example.supabase.co',
      supabaseKey: 'supabase-key',
    });

    expect(getCredentials().vercelToken).toBe('vercel-token');

    clearCredentials();

    expect(getCredentials().githubToken).toBe('');
    expect(dispatchSpy).toHaveBeenCalledTimes(2);
  });

  it('detects whether a usable github token exists', () => {
    expect(hasGitHubToken()).toBe(false);

    saveCredentials({
      githubToken: 'ghp_1234567890123456789012345678901234567890',
      vercelToken: '',
      supabaseUrl: '',
      supabaseKey: '',
    });

    expect(hasGitHubToken()).toBe(true);
  });

  it('stored value is not plaintext', () => {
    saveCredentials({
      githubToken: 'ghp_secret_token_12345',
      vercelToken: '',
      supabaseUrl: '',
      supabaseKey: '',
    });

    const raw = localStorage.getItem('ab_credentials_enc');
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('ghp_secret_token_12345');
    expect(raw).not.toContain('githubToken');
  });

  it('can round-trip encrypt/decrypt', () => {
    const creds = {
      githubToken: 'ghp_roundtrip_test',
      vercelToken: 'vercel_abc123',
      supabaseUrl: 'https://project.supabase.co',
      supabaseKey: 'sb_key_xyz',
    };

    saveCredentials(creds);
    const loaded = getCredentials();
    expect(loaded).toEqual(creds);
  });

  it('corrupt data returns defaults (no crash)', () => {
    localStorage.setItem('ab_credentials_enc', '!!!not-valid-base64!!!');
    const result = getCredentials();
    expect(result.githubToken).toBe('');
  });
});
