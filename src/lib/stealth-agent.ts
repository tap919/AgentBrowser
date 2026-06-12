export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export interface FingerprintConfig {
  userAgent: string;
  viewport: { width: number; height: number };
  locale: string;
  timezone: string;
  platform: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
];

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
];

export function getRotatingProxy(index: number): ProxyConfig | undefined {
  const proxyUrl = process.env.PROXY_URL;
  const proxyList = process.env.PROXY_LIST;
  if (proxyList) {
    const proxies = proxyList.split(',').map(p => p.trim()).filter(Boolean);
    if (proxies.length > 0) {
      const selected = proxies[index % proxies.length];
      return { server: selected };
    }
  }
  if (proxyUrl) return { server: proxyUrl };
  return undefined;
}

export function getRandomFingerprint(): FingerprintConfig {
  const uaIndex = Math.floor(Math.random() * USER_AGENTS.length);
  const vpIndex = Math.floor(Math.random() * VIEWPORTS.length);

  const locales = ['en-US', 'en-GB', 'en-CA', 'en-AU', 'en-NZ'];
  const timezones = ['America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Australia/Sydney'];
  const platforms = ['Win32', 'MacIntel', 'Linux x86_64'];

  return {
    userAgent: USER_AGENTS[uaIndex],
    viewport: VIEWPORTS[vpIndex],
    locale: locales[Math.floor(Math.random() * locales.length)],
    timezone: timezones[Math.floor(Math.random() * timezones.length)],
    platform: platforms[Math.floor(Math.random() * platforms.length)],
  };
}

export function generateSessionId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let session = '';
  for (let i = 0; i < 16; i++) session += chars[Math.floor(Math.random() * chars.length)];
  return `ab-session-${session}`;
}
