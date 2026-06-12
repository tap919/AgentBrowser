import { PhaseRunner, type PhaseInput, type PhaseResult } from '../PhaseRunner';

export class Phase5Browser extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal): Promise<PhaseResult> {
    const start = Date.now();
    try {
      const projectDir = input.name.replace(/[^a-zA-Z0-9-_]/g, '');
      const playwrightConfig = {
        testDir: './e2e',
        timeout: 30000,
        expect: { timeout: 5000 },
        use: { headless: true, viewport: { width: 1280, height: 720 } },
      };
      this.writeFile(`${projectDir}/playwright.config.ts`,
        `import { defineConfig } from '@playwright/test';\nexport default defineConfig(${JSON.stringify(playwrightConfig, null, 2)});\n`);

      this.writeFile(`${projectDir}/e2e/basic.spec.ts`,
        `import { test, expect } from '@playwright/test';\n` +
        `test('homepage loads', async ({ page }) => {\n` +
        `  await page.goto('http://localhost:3000');\n` +
        `  await expect(page).toHaveTitle(/.*/);\n` +
        `});\n`);

      return {
        phaseId, phaseName: 'Browser Automation Engine', status: 'success',
        output: 'Playwright config and basic test created',
        durationMs: Date.now() - start,
        artifacts: ['playwright.config.ts', 'e2e/basic.spec.ts'],
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'Browser Automation Engine', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }
}
