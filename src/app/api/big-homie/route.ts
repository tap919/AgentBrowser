import { NextResponse } from 'next/server';
import { spawnSync } from 'child_process';

interface ChatRequest {
  message: string;
  mode?: 'browse' | 'research' | 'scrape';
  sessionId?: string;
}

const QWEN_BIN = 'qwen';

const MODE_CONTEXT: Record<string, string> = {
  browse: 'You are operating in browse mode. The user is browsing the web. Prioritize browser automation, page navigation, content summarization, and web search. Use tools: browser_navigate, browser_screenshot, web_search.',
  research: 'You are operating in research mode. Prioritize multi-source analysis, citation, data extraction, and structured reporting. Use tools: web_search, github_search_repos, file_read.',
  scrape: 'You are operating in scrape mode. Focus on data extraction, structured output, and content parsing. Use tools: browser_navigate, vision_analyze_image, file_write.',
};

function buildSystemPrompt(mode: string): string {
  const context = MODE_CONTEXT[mode] ?? MODE_CONTEXT.browse;
  return `${context}\n\nYou are integrated as the command center for AgentBrowser. Big Homie is your agent persona. Be concise, actionable, and transparent about tool usage.`;
}

export async function POST(request: Request) {
  let body: ChatRequest;
  try {
    body = await request.json() as ChatRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, mode = 'browse', sessionId } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(mode);
  const sessionArg = sessionId ? ['--session-id', sessionId] : [];

  const args = [
    ...sessionArg,
    '--acp',
    '--channel', 'ACP',
    '--approval-mode', 'yolo',
    '--chat-recording', 'false',
    '--output-format', 'json',
    '--system-prompt', systemPrompt,
    '--prompt', message.trim(),
  ];

  try {
    const result = spawnSync(QWEN_BIN, args, {
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.error) {
      const nodeError = result.error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return NextResponse.json({ error: 'Qwen Code CLI not found. Is it installed and in PATH?' }, { status: 503 });
      }
      return NextResponse.json({ error: `Qwen Code error: ${nodeError.message}` }, { status: 500 });
    }

    const stdout = result.stdout?.trim() ?? '';
    const stderr = result.stderr?.trim() ?? '';

    if (result.status !== 0 && !stdout) {
      console.error('[BigHomie] Qwen Code stderr:', stderr);
      return NextResponse.json({ error: `Qwen Code exited with code ${result.status}: ${stderr || 'Unknown error'}` }, { status: 500 });
    }

    let parsed: unknown = null;
    if (stdout) {
      try {
        parsed = JSON.parse(stdout);
      } catch {
        parsed = stdout;
      }
    }

    return NextResponse.json({
      response: parsed ?? { text: stdout || stderr || 'No response' },
      stderr: stderr || undefined,
      exitCode: result.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[BigHomie] Exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
