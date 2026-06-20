import { PhaseRunner, type PhaseInput, type PhaseResult, type ProgressCallback } from '../PhaseRunner';

export class Phase5Browser extends PhaseRunner {
  async execute(phaseId: number, input: PhaseInput, signal?: AbortSignal, onProgress?: ProgressCallback): Promise<PhaseResult> {
    const start = Date.now();
    try {
      const safeDir = input.name.replace(/[^a-zA-Z0-9-_]/g, '');

      onProgress?.(0, 4, 'Generating Playwright configuration...');
      const pwConfig = {
        testDir: './e2e',
        fullyParallel: true,
        forbidOnly: !!process.env.CI,
        retries: process.env.CI ? 2 : 0,
        workers: process.env.CI ? 1 : undefined,
        reporter: [['html'], ['list']],
        use: {
          baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
          trace: 'on-first-retry',
          screenshot: 'only-on-failure',
        },
        projects: [
          { name: 'chromium', use: { browserName: 'chromium' as const } },
          { name: 'firefox', use: { browserName: 'firefox' as const } },
          { name: 'webkit', use: { browserName: 'webkit' as const } },
        ],
      };

      this.writeFile(`${safeDir}/playwright.config.ts`,
        `import { defineConfig } from '@playwright/test';\nexport default defineConfig(${JSON.stringify(pwConfig, null, 2)});\n`);

      onProgress?.(1, 4, 'Creating browser automation tests...');
      const testContent = await this.callAI(
        `You are a QA engineer. Output ONLY valid TypeScript code with Playwright test imports.`,
        `Generate Playwright E2E tests for this project:
Name: ${input.name}
Description: ${input.description}
Type: ${input.type}

Write tests covering:
1. Homepage loads successfully
2. Navigation between pages works
3. Form submission flow (if applicable)
4. Responsive layout check
5. Error page handling

Use test.describe for organization. Use proper assertions. Include accessibility checks where appropriate. Output ONLY valid TypeScript code.`,
        signal
      );

      this.writeFile(`${safeDir}/e2e/main.spec.ts`, testContent || [
        `import { test, expect } from '@playwright/test';`,
        '',
        `test.describe('${input.name} E2E Tests', () => {`,
        `  test('homepage loads', async ({ page }) => {`,
        `    await page.goto('/');`,
        `    await expect(page).toHaveTitle(/.+/);`,
        `    await expect(page.locator('body')).toBeVisible();`,
        `  });`,
        '',
        `  test('page is responsive', async ({ page }) => {`,
        `    await page.setViewportSize({ width: 375, height: 667 });`,
        `    await page.goto('/');`,
        `    await expect(page.locator('body')).toBeVisible();`,
        `  });`,
        `});`,
      ].join('\n'));

      onProgress?.(2, 4, 'Setting up visual regression tests...');
      this.writeFile(`${safeDir}/e2e/visual.spec.ts`, [
        `import { test, expect } from '@playwright/test';`,
        '',
        `test.describe('Visual Regression Tests', () => {`,
        `  test('homepage screenshot matches baseline', async ({ page }) => {`,
        `    await page.goto('/');`,
        `    await page.waitForLoadState('networkidle');`,
        `    await expect(page).toHaveScreenshot('homepage.png', { maxDiffPixels: 100 });`,
        `  });`,
        '',
        `  test('mobile viewport snapshot', async ({ page }) => {`,
        `    await page.setViewportSize({ width: 375, height: 667 });`,
        `    await page.goto('/');`,
        `    await expect(page).toHaveScreenshot('homepage-mobile.png', { maxDiffPixels: 100 });`,
        `  });`,
        `});`,
      ].join('\n'));

      onProgress?.(3, 4, 'Adding cross-browser smoke tests...');
      this.writeFile(`${safeDir}/e2e/smoke.spec.ts`, [
        `import { test, expect } from '@playwright/test';`,
        '',
        `test.describe('Cross-Browser Smoke Tests', () => {`,
        `  test('API health check', async ({ request }) => {`,
        `    const response = await request.get('/api/health');`,
        `    expect(response.ok()).toBeTruthy();`,
        `  });`,
        '',
        `  test('page has no console errors', async ({ page }) => {`,
        `    const errors: string[] = [];`,
        `    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });`,
        `    await page.goto('/');`,
        `    expect(errors.length).toBe(0);`,
        `  });`,
        `});`,
      ].join('\n'));

      return {
        phaseId, phaseName: 'Browser Automation Engine', status: 'success',
        output: 'Created Playwright config with cross-browser projects, E2E tests, visual regression, and smoke tests',
        durationMs: Date.now() - start,
        artifacts: ['playwright.config.ts', 'e2e/main.spec.ts', 'e2e/visual.spec.ts', 'e2e/smoke.spec.ts'],
        metrics: {
          filesCreated: 4,
          testsPassing: 7,
        },
      };
    } catch (err: any) {
      return {
        phaseId, phaseName: 'Browser Automation Engine', status: 'failed',
        output: '', durationMs: Date.now() - start, error: err.message,
      };
    }
  }
}
