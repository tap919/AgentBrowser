import { NextResponse } from 'next/server';
import { executeBrowserTask, createBrowserTask, type BrowserTaskAction } from '@/lib/browser-pipeline';
import { apiAuthMiddleware } from '@/lib/api-auth-middleware';

export const POST = apiAuthMiddleware(async (request: Request) => {
  try {
    const body = await request.json() as { action: BrowserTaskAction; url: string; selectors?: string[] };
    if (!body.action || !body.url) {
      return NextResponse.json({ error: 'action and url required' }, { status: 400 });
    }
    const task = createBrowserTask(body.action, body.url, body.selectors);
    const result = await executeBrowserTask(task);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
