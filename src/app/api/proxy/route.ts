import { NextRequest, NextResponse } from 'next/server';
import { isIP } from 'net';
import { resolve4 } from 'dns/promises';

const MAX_BODY = 10 * 1024 * 1024;
const FETCH_TIMEOUT = 15_000;
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

const PRIVATE_RANGES = [
  /^127\./, /^10\./, /^0\./, /^169\.254\./,
  /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./,
];

function isPrivateIP(ip: string): boolean {
  return PRIVATE_RANGES.some(re => re.test(ip));
}

/** Reject URLs that point at private / internal IPs (SSRF guard, with DNS resolution). */
async function isBlockedHost(urlStr: string): Promise<boolean> {
  try {
    const parsed = new URL(urlStr);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol) || parsed.username || parsed.password) {
      return true;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '::1' || hostname === '[::1]' || hostname === '0.0.0.0') {
      return true;
    }
    if (isIP(hostname)) {
      return isPrivateIP(hostname);
    }
    // Resolve DNS to catch hostnames pointing at private IPs (SSRF bypass prevention)
    try {
      const addresses = await resolve4(hostname);
      if (addresses.some(addr => isPrivateIP(addr))) {
        return true;
      }
    } catch {
      // DNS resolution failed — reject to be safe
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');
  if (!target) {
    return NextResponse.json({ error: 'Missing ?url= parameter' }, { status: 400 });
  }

  // Only allow http(s) schemes
  if (!/^https?:\/\//i.test(target)) {
    return NextResponse.json({ error: 'Only http/https URLs are allowed' }, { status: 400 });
  }

  if (await isBlockedHost(target)) {
    return NextResponse.json({ error: 'Blocked host' }, { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const upstream = await fetch(target, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });

      const ct = upstream.headers.get('content-type') ?? 'text/html';

      // For non-HTML content, just stream it through
      if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
        const body = await upstream.arrayBuffer();
        if (body.byteLength > MAX_BODY) {
          return NextResponse.json({ error: 'Response too large' }, { status: 413 });
        }
        return new NextResponse(body, {
          status: upstream.status,
          headers: {
            'Content-Type': ct,
            'Cache-Control': 'public, max-age=300',
          },
        });
      }

      let html = await upstream.text();
      if (html.length > MAX_BODY) {
        return NextResponse.json({ error: 'Response too large' }, { status: 413 });
      }

      // Inject <base> so relative URLs resolve against the original domain
      const origin = new URL(target);
      const baseHref = `${origin.protocol}//${origin.host}${origin.port ? ':' + origin.port : ''}`;
      if (!/<base\b/i.test(html)) {
        html = html.replace(
          /(<head[^>]*>)/i,
          `$1<base href="${baseHref}/" />`,
        );
      }

      return new NextResponse(html, {
        status: upstream.status,
        headers: {
          'Content-Type': ct,
          'Cache-Control': 'public, max-age=300',
          // Explicitly allow framing
          'X-Frame-Options': 'ALLOWALL',
        },
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
