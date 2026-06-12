import { test, expect } from '@playwright/test';

test.describe('Website Build User Journey', () => {
  test.setTimeout(90000);

  test('homepage shows app shell with branding and mode switcher', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await expect(page.locator('text=UltimateAgent')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button[title*="Autonomous"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[title="Security monitoring & settings"]')).toBeVisible({ timeout: 3000 });
  });

  test('build mode shows ProjectForm inputs in dev mode', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      try {
        const s = JSON.parse(localStorage.getItem('ab_settings') || '{}');
        s.mode = 'dev';
        localStorage.setItem('ab_settings', JSON.stringify(s));
      } catch {}
      localStorage.removeItem('ab_build_state');
    });
    await page.reload();
    await page.waitForTimeout(1500);

    await page.locator('button[title="Autonomous project builder"]').click();
    await page.waitForTimeout(1500);
    await expect(page.locator('#project-name')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#project-desc')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Project Name')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Description')).toBeVisible({ timeout: 3000 });
  });

  test('submit project triggers analysis phase', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      try {
        const s = JSON.parse(localStorage.getItem('ab_settings') || '{}');
        s.mode = 'dev';
        localStorage.setItem('ab_settings', JSON.stringify(s));
      } catch {}
      localStorage.removeItem('ab_build_state');
    });
    await page.reload();
    await page.waitForTimeout(1500);

    await page.locator('button[title="Autonomous project builder"]').click();
    await page.waitForTimeout(1000);
    await page.locator('#project-name').fill('My AI Website');
    await page.locator('#project-desc').fill('A modern portfolio website with AI-powered features and smooth animations.');
    await page.locator('#project-audience').fill('Creative professionals');
    await page.locator('button[type="submit"]').click();

    // The form transitions to analyzing state
    await expect(page.locator('text=analyzing').first()).toBeVisible({ timeout: 20000 });
  });

  test('preview page loads without error', async ({ page }) => {
    await page.goto('/preview');
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
