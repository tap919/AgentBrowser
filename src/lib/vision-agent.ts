export interface VisionQuery {
  screenshotBase64: string;
  prompt: string;
  pageContent?: string;
}

export interface VisionResult {
  description: string;
  elements: VisionElement[];
  actionPlan: string[];
}

export interface VisionElement {
  tag: string;
  text: string;
  position: { x: number; y: number; width: number; height: number };
  attributes: Record<string, string>;
}

export async function analyzeScreenshot(query: VisionQuery): Promise<VisionResult> {
  const llmEndpoint = process.env.LLM_VISION_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.LLM_VISION_API_KEY || '';

  if (!apiKey) {
    return fallbackAnalysis(query);
  }

  try {
    const res = await fetch(llmEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.LLM_VISION_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a browser automation agent. Analyze the screenshot and page content to identify interactive elements and describe what the user should do next. Return JSON with description, elements array (tag, text, bounding box), and actionPlan array.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Task: ${query.prompt}\nPage HTML preview: ${(query.pageContent || '').slice(0, 3000)}` },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${query.screenshotBase64}` } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2000,
      }),
    });

    if (!res.ok) throw new Error(`Vision API returned ${res.status}`);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    return JSON.parse(data.choices[0]?.message?.content || '{}') as VisionResult;
  } catch (err) {
    console.error('[VisionAgent] API call failed, using fallback:', err);
    return fallbackAnalysis(query);
  }
}

function fallbackAnalysis(query: VisionQuery): VisionResult {
  const elements = extractElementsFromHtml(query.pageContent || '');
  return {
    description: `Page contains ${elements.length} detectable elements. ${query.prompt}`,
    elements,
    actionPlan: elements.length > 0
      ? [`Click element: ${elements[0].text || elements[0].tag}`]
      : ['No interactive elements detected'],
  };
}

export function extractElementsFromHtml(html: string): VisionElement[] {
  const elements: VisionElement[] = [];
  const patterns = [
    { tag: 'button', regex: /<button[^>]*>([\s\S]*?)<\/button>/gi },
    { tag: 'a', regex: /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi },
    { tag: 'input', regex: /<input[^>]*placeholder="([^"]*)"[^>]*>/gi },
    { tag: 'textarea', regex: /<textarea[^>]*placeholder="([^"]*)"[^>]*>/gi },
    { tag: 'select', regex: /<select[^>]*>[\s\S]*?<\/select>/gi },
  ];

  for (const { tag, regex } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      const text = stripTags(match[1] || match[0]).trim().slice(0, 100);
      if (text || tag === 'input') {
        elements.push({
          tag,
          text: text || match[1] || '',
          position: { x: 0, y: 0, width: 0, height: 0 },
          attributes: extractAttributes(match[0]),
        });
      }
    }
  }

  return elements.slice(0, 20);
}

function stripTags(str: string): string {
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractAttributes(tagHtml: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)=["']([^"']*)["']/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(tagHtml)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}
