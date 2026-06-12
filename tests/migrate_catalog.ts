import { chromium } from '@playwright/test';
import * as path from 'path';

async function run() {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to ASCAP...');
    try {
        await page.goto('https://www.ascap.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        console.log('Taking screenshot of homepage...');
        await page.screenshot({ path: path.join(process.cwd(), 'ascap_home.png') });
        
        console.log('Page title:', await page.title());
        
        // Wait for login link and click it
        console.log('Looking for Login button...');
        const loginLink = page.locator('a:has-text("Log In"), a:has-text("Login")');
        if (await loginLink.count() > 0) {
            await loginLink.first().click();
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        } else {
            console.log('Login button not found on homepage. Assuming we need to navigate manually.');
            await page.goto('https://ome.ascap.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
        }
        
        console.log('Taking screenshot of login page...');
        await page.screenshot({ path: path.join(process.cwd(), 'ascap_login.png') });

        const usernameInput = page.locator('input[type="text"], input[name="username"], input[name="userid"], input[placeholder*="sername"], input[placeholder*="Member ID"]');
        const passwordInput = page.locator('input[type="password"]');
        
        await usernameInput.first().waitFor({ state: 'visible', timeout: 15000 });
        console.log('Found username input, filling...');
        await usernameInput.first().fill('tap45000');
        
        console.log('Filling password...');
        await passwordInput.first().fill('Trepound7');
        
        console.log('Clicking login...');
        const loginBtn = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Login"), input[type="submit"]');
        await loginBtn.first().click();
        
        console.log('Waiting for login to complete...');
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => console.log('Navigation wait timed out, proceeding...'));
        
        console.log('Taking screenshot after login attempt...');
        await page.screenshot({ path: path.join(process.cwd(), 'ascap_dashboard.png') });
        console.log('ASCAP Phase 1 login sequence complete. Check ascap_dashboard.png');
    } catch (e) {
        console.error('Error during execution:', e);
        await page.screenshot({ path: path.join(process.cwd(), 'error_screenshot.png') }).catch(() => {});
    } finally {
        await browser.close();
    }
}

run().catch(console.error);
