import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('ASCAP Migration Phase 1', () => {
    test.setTimeout(120000); // 2 minutes

    test('Extract catalog from ASCAP', async ({ page }) => {
        console.log('Navigating to ASCAP Member Access...');
        // Common login URLs for ASCAP
        await page.goto('https://member.ascap.com/login', { waitUntil: 'networkidle' });
        
        console.log('Taking screenshot of login page...');
        await page.screenshot({ path: path.join(__dirname, '..', 'ascap_login.png') });
        
        // Let's print the title to ensure we are on the right page
        console.log('Page title:', await page.title());
        
        // Try to login using generic locators
        const usernameInput = page.locator('input[type="text"], input[name="username"], input[name="userid"], input[placeholder*="sername"], input[placeholder*="Member ID"]');
        const passwordInput = page.locator('input[type="password"]');
        
        await expect(usernameInput.first()).toBeVisible({ timeout: 15000 });
        console.log('Found username input, filling...');
        await usernameInput.first().fill('tap45000');
        
        console.log('Filling password...');
        await passwordInput.first().fill('Trepound7');
        
        console.log('Clicking login...');
        const loginBtn = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Login"), input[type="submit"]');
        await loginBtn.first().click();
        
        // Wait for login to complete and navigate to dashboard
        console.log('Waiting for login to complete...');
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => console.log('Navigation wait timed out, proceeding anyway...'));
        
        console.log('Taking screenshot after login attempt...');
        await page.screenshot({ path: path.join(__dirname, '..', 'ascap_dashboard.png') });
        
        console.log('ASCAP Phase 1 login sequence complete. Check ascap_dashboard.png');
    });
});
