export type BrowserTaskAction = 'extract' | 'screenshot' | 'reader' | 'search' | 'monitor';

export interface BrowserTask {
  id: string;
  action: BrowserTaskAction;
  url: string;
  selectors?: string[];
  output?: unknown;
  error?: string;
  durationMs?: number;
}

export interface BrowserTaskResult {
  taskId: string;
  action: BrowserTaskAction;
  url: string;
  success: boolean;
  content?: string;
  structured?: Record<string, unknown>[];
  screenshot?: string;
  error?: string;
}

export async function executeBrowserTask(task: BrowserTask): Promise<BrowserTaskResult> {
  const base = typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Validate URL before proxying
  if (!/^https?:\/\//i.test(task.url)) {
    return { taskId: task.id, action: task.action, url: task.url, success: false, error: 'Only http/https URLs allowed' };
  }

  try {
    const res = await fetch(`${base}/api/proxy?url=${encodeURIComponent(task.url)}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return { taskId: task.id, action: task.action, url: task.url, success: false, error: `Proxy returned ${res.status}` };
    }

    const html = await res.text();

    if (task.action === 'extract' && task.selectors) {
      const structured = extractBySelectors(html, task.selectors);
      return { taskId: task.id, action: task.action, url: task.url, success: true, structured, content: html.slice(0, 5000) };
    }

    if (task.action === 'reader') {
      const content = extractReadable(html);
      return { taskId: task.id, action: task.action, url: task.url, success: true, content };
    }

    return { taskId: task.id, action: task.action, url: task.url, success: true, content: html.slice(0, 10000) };
  } catch (err: unknown) {
    return { taskId: task.id, action: task.action, url: task.url, success: false, error: err instanceof Error ? err.message : 'Request failed' };
  }
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractBySelectors(html: string, selectors: string[]): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  for (const sel of selectors) {
    const escaped = escapeRegex(sel);
    const regex = new RegExp(`<[^>]*${escaped}[^>]*>[\\s\\S]*?<\\/[^>]+>`, 'gi');
    const matches = html.match(regex);
    if (matches) {
      results.push({ selector: sel, count: matches.length, preview: stripHtml(matches[0]).slice(0, 200) });
    }
  }
  return results;
}

export function extractReadable(html: string): string {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!body) return stripHtml(html).slice(0, 5000);
  return stripHtml(body[1]).replace(/\s+/g, ' ').trim().slice(0, 10000);
}

export function stripHtml(html: string): string {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ');
}

export function createBrowserTask(action: BrowserTaskAction, url: string, selectors?: string[]): BrowserTask {
  return { id: crypto.randomUUID(), action, url, selectors };
}
