import { NextResponse } from 'next/server';
import { apiAuthMiddleware } from '@/lib/api-auth-middleware';

// API route for Playwright CDP browser control
// This runs server-side and controls actual browser instances

export const POST = apiAuthMiddleware(async (request: Request) => {
  try {
    const body = await request.json() as {
      action: 'launch' | 'navigate' | 'click' | 'fill' | 'screenshot' | 'get-content' | 'close' | 'execute';
      url?: string;
      selector?: string;
      text?: string;
      value?: string;
      script?: string;
      config?: { headless?: boolean; proxy?: { server: string } };
    };

    // All browser operations are async and server-side
    switch (body.action) {
      case 'launch': {
        const { launchBrowser } = await import('@/lib/browser-controller');
        await launchBrowser(body.config || { headless: true });
        return NextResponse.json({ success: true, message: 'Browser launched' });
      }

      case 'navigate': {
        if (!body.url) return NextResponse.json({ error: 'url required' }, { status: 400 });
        const { navigate } = await import('@/lib/browser-controller');
        await navigate(body.url);
        const { getVisibleText } = await import('@/lib/browser-controller');
        const text = await getVisibleText();
        return NextResponse.json({ success: true, url: body.url, contentPreview: text.slice(0, 2000) });
      }

      case 'click': {
        const { click, clickByText } = await import('@/lib/browser-controller');
        if (body.selector) await click(body.selector);
        else if (body.text) await clickByText(body.text);
        else return NextResponse.json({ error: 'selector or text required' }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      case 'fill': {
        if (!body.selector || body.value === undefined) {
          return NextResponse.json({ error: 'selector and value required' }, { status: 400 });
        }
        const { fill } = await import('@/lib/browser-controller');
        await fill(body.selector, body.value);
        return NextResponse.json({ success: true });
      }

      case 'screenshot': {
        const { takeScreenshotBase64 } = await import('@/lib/browser-controller');
        const base64 = await takeScreenshotBase64();
        return NextResponse.json({ success: true, screenshotBase64: base64 });
      }

      case 'get-content': {
        const { getPageContent, getVisibleText } = await import('@/lib/browser-controller');
        const [html, text] = await Promise.all([getPageContent(), getVisibleText()]);
        return NextResponse.json({ success: true, html: html.slice(0, 10000), visibleText: text.slice(0, 5000) });
      }

      case 'close': {
        const { closeBrowser } = await import('@/lib/browser-controller');
        await closeBrowser();
        return NextResponse.json({ success: true, message: 'Browser closed' });
      }

      case 'execute': {
        if (!body.script) return NextResponse.json({ error: 'script required' }, { status: 400 });
        const { evaluate } = await import('@/lib/browser-controller');
        const result = await evaluate(new Function(body.script) as () => unknown);
        return NextResponse.json({ success: true, result });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
});

export async function GET() {
  return NextResponse.json({
    available: true,
    actions: ['launch', 'navigate', 'click', 'fill', 'screenshot', 'get-content', 'close', 'execute'],
  });
}
