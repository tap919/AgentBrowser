// Client-side credential manager with at-rest obfuscation.
// Tokens are stored XOR-encrypted in localStorage to prevent
// casual plaintext reading. Key is derived from a random seed
// stored in sessionStorage (cleared on browser restart).

export interface Credentials {
  githubToken: string;
  vercelToken: string;
  supabaseUrl: string;
  supabaseKey: string;
}

const STORAGE_KEY = 'ab_credentials_enc';
const KEY_STORAGE_KEY = 'ab_crypt_key';

const DEFAULTS: Credentials = {
  githubToken: '',
  vercelToken: '',
  supabaseUrl: '',
  supabaseKey: '',
};

function getOrCreateKey(): string {
  try {
    let key = sessionStorage.getItem(KEY_STORAGE_KEY);
    if (!key) {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
      key = Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      sessionStorage.setItem(KEY_STORAGE_KEY, key);
    }
    return key;
  } catch {
    return 'fallback-key-32chars!!';
  }
}

function xorEncrypt(text: string, key: string): string {
  const result = new Array(text.length);
  for (let i = 0; i < text.length; i++) {
    result[i] = String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result.join(''));
}

function xorDecrypt(data: string, key: string): string {
  try {
    const text = atob(data);
    const result = new Array(text.length);
    for (let i = 0; i < text.length; i++) {
      result[i] = String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result.join('');
  } catch {
    return '';
  }
}

function pack(creds: Credentials): string {
  return JSON.stringify(creds);
}

function unpack(raw: string): Credentials {
  try {
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function getCredentials(): Credentials {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const key = getOrCreateKey();
    const decrypted = xorDecrypt(raw, key);
    if (!decrypted) return { ...DEFAULTS };
    return unpack(decrypted);
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveCredentials(creds: Credentials): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getOrCreateKey();
    const encrypted = xorEncrypt(pack(creds), key);
    localStorage.setItem(STORAGE_KEY, encrypted);
    window.dispatchEvent(new CustomEvent('ab:credentials-changed'));
  } catch {
    // silent fail
  }
}

export function clearCredentials(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(KEY_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('ab:credentials-changed'));
}

export function hasGitHubToken(): boolean {
  return getCredentials().githubToken.length >= 40;
}
