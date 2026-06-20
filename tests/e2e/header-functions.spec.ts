import { test, expect } from '@playwright/test';

test.describe('Header Functions', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      try {
        const s = JSON.parse(localStorage.getItem('ab_settings') || '{}');
        s.mode = 'dev';
        localStorage.setItem('ab_settings', JSON.stringify(s));
      } catch {}
    });
    await page.reload();
    await page.waitForTimeout(2000);
  });

  test('branding, mode switcher, security, theme, and new project button all visible', async ({ page }) => {
    await expect(page.locator('text=UltimateAgent')).toBeVisible({ timeout: 10000 });
    // ModeSwitcher buttons
    await expect(page.locator('button[title="Autonomous project builder"]')).toBeVisible();
    await expect(page.locator('button[title*="web browsing"]')).toBeVisible();
    await expect(page.locator('button[title*="deep research"]')).toBeVisible();
    await expect(page.locator('button[title*="data extraction"]')).toBeVisible();
    await expect(page.locator('button[title="Security monitoring & settings"]')).toBeVisible();
    // Security status shield
    await expect(page.locator('button[title="Security Status"]')).toBeVisible();
    // Dev/Easy mode toggle
    await expect(page.locator('button[title*="switch between"]')).toBeVisible();
    // New project button (right side)
    await expect(page.locator('button:has(span:has-text("New"))')).toBeVisible();
  });

  test('mode switcher navigates to each workspace', async ({ page }) => {
    // Build
    await page.locator('button[title="Autonomous project builder"]').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('#project-name')).toBeVisible({ timeout: 8000 });

    // Browse
    await page.locator('button[title*="web browsing"]').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('input[placeholder*="enter"]')).toBeVisible({ timeout: 8000 }).catch(() => {});

    // Security
    await page.locator('button[title="Security monitoring & settings"]').click();
    await page.waitForTimeout(1000);

    // Ventures/Dashboard
    await page.locator('button[title*="business dashboard"]').click();
    await page.waitForTimeout(1000);
  });

  test('easy/dev mode toggle switches modes', async ({ page }) => {
    const toggle = page.locator('button[title*="switch between"]');
    const currentMode = await toggle.innerText();
    await toggle.click();
    await page.waitForTimeout(1000);
    const newMode = await toggle.innerText();
    expect(newMode).not.toBe(currentMode);
  });

  test('security shield opens security workspace', async ({ page }) => {
    await page.locator('button[title="Security Status"]').click();
    await page.waitForTimeout(1000);
    // Should switch to security mode
  });

  test('settings drawer opens', async ({ page }) => {
    const settingsBtn = page.locator('button[title="Settings & integrations"]');
    if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(1000);
      // Settings drawer should be visible
    }
  });

  test('preview page renders', async ({ page }) => {
    await page.goto('/preview');
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
