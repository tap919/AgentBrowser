export interface CaptchaSolution {
  success: boolean;
  token?: string;
  text?: string;
  error?: string;
}

export type CaptchaProvider = '2captcha' | 'capsolver' | 'none';

const DEFAULT_PROVIDER: CaptchaProvider = (process.env.CAPTCHA_PROVIDER as CaptchaProvider) || 'none';

export async function solveCaptcha(
  imageBase64: string,
  provider?: CaptchaProvider,
): Promise<CaptchaSolution> {
  const p = provider || DEFAULT_PROVIDER;

  switch (p) {
    case '2captcha':
      return solveWith2Captcha(imageBase64);
    case 'capsolver':
      return solveWithCapsolver(imageBase64);
    case 'none':
    default:
      return { success: false, error: 'No CAPTCHA solver configured. Set CAPTCHA_PROVIDER and API key.' };
  }
}

async function solveWith2Captcha(imageBase64: string): Promise<CaptchaSolution> {
  const apiKey = process.env.CAPTCHA_API_KEY;
  if (!apiKey) return { success: false, error: 'CAPTCHA_API_KEY not set' };

  try {
    // Upload
    const uploadRes = await fetch('https://2captcha.com/in.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: apiKey,
        method: 'base64',
        body: imageBase64,
        json: 1,
      }),
    });
    const uploadData = await uploadRes.json() as { status: number; request: string };
    if (uploadData.status !== 1) return { success: false, error: `Upload failed: ${uploadData.request}` };

    const captchaId = uploadData.request;

    // Poll for result
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const resultRes = await fetch(`https://2captcha.com/res.php?key=${apiKey}&action=get&id=${captchaId}&json=1`);
      const resultData = await resultRes.json() as { status: number; request: string };
      if (resultData.status === 1) return { success: true, text: resultData.request };
    }

    return { success: false, error: '2Captcha polling timed out' };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : '2Captcha error' };
  }
}

async function solveWithCapsolver(imageBase64: string): Promise<CaptchaSolution> {
  const apiKey = process.env.CAPTCHA_API_KEY;
  if (!apiKey) return { success: false, error: 'CAPTCHA_API_KEY not set' };

  try {
    const createRes = await fetch('https://api.capsolver.com/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientKey: apiKey,
        task: {
          type: 'ImageToTextTask',
          body: imageBase64,
        },
      }),
    });
    const createData = await createRes.json() as { taskId?: string; errorDescription?: string };
    if (!createData.taskId) return { success: false, error: createData.errorDescription || 'Capsolver create failed' };

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const resultRes = await fetch('https://api.capsolver.com/getTaskResult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientKey: apiKey, taskId: createData.taskId }),
      });
      const resultData = await resultRes.json() as { status: string; solution?: { text: string }; errorDescription?: string };
      if (resultData.status === 'ready') return { success: true, text: resultData.solution?.text };
      if (resultData.status === 'failed') return { success: false, error: resultData.errorDescription || 'Capsolver failed' };
    }

    return { success: false, error: 'Capsolver polling timed out' };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Capsolver error' };
  }
}
