import { test, expect } from '@playwright/test';

test.describe('AgentBrowser Core Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the main page without errors', async ({ page }) => {
    await expect(page.getByText('AgentBrowser')).toBeVisible();
  });

  test('should switch between modes', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'What do you want to build?' })).toBeVisible();
    
    await page.getByRole('button', { name: 'Browse' }).click();
    await expect(page.getByRole('heading', { name: 'AgentBrowser' })).toBeVisible();
    await expect(page.getByPlaceholder('Search or enter URL...')).toBeVisible();
    
    await page.getByRole('button', { name: 'Research' }).click();
    await expect(page.getByRole('heading', { name: 'Deep Research Mode' })).toBeVisible();
    
    await page.getByRole('button', { name: 'Scrape' }).click();
    await expect(page.getByRole('heading', { name: 'Data Extraction Pipeline' })).toBeVisible();
    
    await page.getByRole('button', { name: 'Security', exact: true }).click();
    await expect(page.locator('main').getByRole('heading', { name: 'Security Dashboard' })).toBeVisible({ timeout: 15000 });
  });

  test('should toggle easy/dev mode', async ({ page }) => {
    const modeBtn = page.locator('button[title="Click to switch between Easy and Dev mode"]');
    await expect(modeBtn).toBeVisible();
    const before = (await modeBtn.textContent())?.trim();
    await modeBtn.click();
    await expect(modeBtn).toBeVisible();
    const after = (await modeBtn.textContent())?.trim();
    expect(after).not.toBe(before);
  });

  test('should open settings drawer', async ({ page }) => {
    const modeBtn = page.locator('button[title="Click to switch between Easy and Dev mode"]');
    if (((await modeBtn.textContent())?.trim() ?? '') !== 'dev') {
      await modeBtn.click();
      await expect(modeBtn).toHaveText('dev');
    }
    await page.getByTitle('Settings & integrations').click();
    await expect(page.locator('main').getByRole('heading', { name: 'Create New Project' })).toBeVisible({ timeout: 15000 });
  });

  test('should have security status indicator', async ({ page }) => {
    await expect(page.getByTitle('Security Status')).toBeVisible();
  });

  test('should have working new project button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'New', exact: true })).toBeVisible();
  });
});

test.describe('Browse Mode Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Browse' }).click();
    await expect(page.getByRole('heading', { name: 'AgentBrowser' })).toBeVisible();
    await expect(page.getByPlaceholder('Search or enter URL...')).toBeVisible();
  });

  test('should display browser tabs', async ({ page }) => {
    await expect(page.getByText('New Tab')).toBeVisible();
  });

  test('should have URL input', async ({ page }) => {
    await expect(page.getByPlaceholder('Search or enter URL...')).toBeVisible();
  });

  test('should have navigation controls', async ({ page }) => {
    await expect(page.getByTitle('Back')).toBeVisible();
    await expect(page.getByTitle('Forward')).toBeVisible();
    await expect(page.getByTitle('Reload')).toBeVisible();
  });
});

test.describe('Security Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Security', exact: true }).click();
    await expect(page.locator('main').getByRole('heading', { name: 'Security Dashboard' })).toBeVisible({ timeout: 15000 });
  });

  test('should display security status', async ({ page }) => {
    await expect(page.getByText('Secure', { exact: true })).toBeVisible();
  });

  test('should have security settings', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Security Level' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Passive/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Active/i })).toBeVisible();
  });
});

test.describe('Research Mode Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Research' }).click();
  });

  test('should have source toggles', async ({ page }) => {
    await expect(page.locator('button:has-text("Web")')).toBeVisible();
    await expect(page.locator('button:has-text("Papers")')).toBeVisible();
    await expect(page.locator('button:has-text("Code")')).toBeVisible();
    await expect(page.locator('button:has-text("Docs")')).toBeVisible();
  });

  test('should have output format selector', async ({ page }) => {
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('option[value="report"]')).toHaveText('Full Report');
  });

  test('should have export button', async ({ page }) => {
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });
});

test.describe('Scrape Mode Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Scrape' }).click();
  });

  test('should have URL input', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Enter target URL"]')).toBeVisible();
  });

  test('should have output format toggles', async ({ page }) => {
    await expect(page.locator('button:has-text("Table")')).toBeVisible();
    await expect(page.locator('button:has-text("JSON")')).toBeVisible();
    await expect(page.locator('button:has-text("CSV")')).toBeVisible();
    await expect(page.locator('button:has-text("Filtered")')).toBeVisible();
  });

  test('should have extract button', async ({ page }) => {
    await expect(page.locator('button:has-text("Extract")')).toBeVisible();
  });
});
