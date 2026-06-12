const CLAW_PROTECT_URL = process.env.CLAW_PROTECT_URL || process.env.NEXT_PUBLIC_CLAW_PROTECT_URL || 'http://localhost:3333';
const CLAW_PROTECT_API_KEY = process.env.CLAW_PROTECT_API_KEY || process.env.NEXT_PUBLIC_CLAW_PROTECT_API_KEY || '';

function clawProtectHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(CLAW_PROTECT_API_KEY ? { Authorization: `Bearer ${CLAW_PROTECT_API_KEY}` } : {}),
  };
}

export async function checkPromptInjection(text: string): Promise<{detected: boolean, warnings?: string[]}> {
  try {
    const response = await fetch(`${CLAW_PROTECT_URL}/api/v1/scan/prompt-injection`, {
      method: 'POST',
      headers: clawProtectHeaders(),
      body: JSON.stringify({ content: text }),
    });
    if (!response.ok) return { detected: false };
    const data = await response.json() as {
      isInjection?: boolean;
      detected?: boolean;
      detectedPatterns?: string[];
      warnings?: string[];
    };
    return {
      detected: data.isInjection ?? data.detected ?? false,
      warnings: data.warnings ?? data.detectedPatterns ?? [],
    };
  } catch (err) {
    console.error('Claw Protect prompt injection scan failed:', err);
    throw err;
  }
}

export async function scanForSecrets(content: string): Promise<string[]> {
  try {
    const response = await fetch(`${CLAW_PROTECT_URL}/api/v1/scan/secrets`, {
      method: 'POST',
      headers: clawProtectHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!response.ok) return [];
    const data = await response.json() as {
      findings?: string[];
      matches?: Array<{ type?: string; secretType?: string }>;
    };
    return data.findings || data.matches?.map(match => match.type || match.secretType || 'secret').filter(Boolean) || [];
  } catch (err) {
    console.error('Claw Protect secrets scan failed:', err);
    throw err;
  }
}

export async function checkClawProtectHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${CLAW_PROTECT_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}
