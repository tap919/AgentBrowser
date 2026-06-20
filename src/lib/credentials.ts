export interface Credentials {
  githubToken: string;
  vercelToken: string;
  supabaseUrl: string;
  supabaseKey: string;
}

const STORAGE_KEY = 'ab_credentials_enc_v2';
const KEY_STORAGE_KEY = 'ab_crypt_key_v2';

const DEFAULTS: Credentials = {
  githubToken: '',
  vercelToken: '',
  supabaseUrl: '',
  supabaseKey: '',
};

function base64ToBuf(b64: string): ArrayBuffer {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function getCryptoKey(): Promise<CryptoKey | null> {
  try {
    const raw = sessionStorage.getItem(KEY_STORAGE_KEY);
    if (raw) {
      return await crypto.subtle.importKey(
        'raw', base64ToBuf(raw), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
      );
    }
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );
    const exported = await crypto.subtle.exportKey('raw', key);
    sessionStorage.setItem(KEY_STORAGE_KEY, bufToBase64(exported));
    return key;
  } catch {
    return null;
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

async function encrypt(text: string): Promise<string | null> {
  const key = await getCryptoKey();
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return bufToBase64(combined.buffer);
}

async function decrypt(data: string): Promise<string | null> {
  try {
    const key = await getCryptoKey();
    if (!key) return null;
    const combined = new Uint8Array(base64ToBuf(data));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    const decoded = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
    return new TextDecoder().decode(decoded);
  } catch {
    return null;
  }
}

export async function getCredentials(): Promise<Credentials> {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const decrypted = await decrypt(raw);
    if (!decrypted) return { ...DEFAULTS };
    return unpack(decrypted);
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveCredentials(creds: Credentials): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const encrypted = await encrypt(pack(creds));
    if (!encrypted) return;
    localStorage.setItem(STORAGE_KEY, encrypted);
    window.dispatchEvent(new CustomEvent('ab:credentials-changed'));
  } catch (err) {
    console.error('[credentials] saveCredentials failed', err);
  }
}

export function clearCredentials(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(KEY_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('ab:credentials-changed'));
}

export async function hasGitHubToken(): Promise<boolean> {
  const creds = await getCredentials();
  return creds.githubToken.length >= 40;
}
