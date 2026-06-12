import { chromium } from 'playwright';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.once('line', async (line) => {
  let credentials: any = {};
  try {
    credentials = JSON.parse(line.trim());
  } catch (err: any) {
    console.log(`❌ Error parsing input: ${err.message}`);
    process.exit(1);
  }

  const { email, sessionId } = credentials;

  console.log('Launching browser (headed)...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to The MLC Portal...');
    await page.goto('https://portal.themlc.com/login', { waitUntil: 'domcontentloaded', timeout: 45000 });

    if (email) {
      console.log('Attempting to fill MLC email...');
      try {
        const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]');
        await emailInput.first().waitFor({ state: 'visible', timeout: 10000 });
        await emailInput.first().fill(email);
        console.log('Email filled. Please enter password and solve any manual security questions.');
      } catch (err: any) {
        console.log('Could not autofill email field. Please fill manually.');
      }
    }

    console.log('Waiting for MFA check or successful login...');
    // We will wait until either:
    // A. The user reaches the dashboard (contains URL like /catalog or has dashboard widgets)
    // B. The page presents a 2FA code verification input field
    
    let is2faFound = false;
    await page.waitForFunction(() => {
      const href = window.location.href;
      const hasMfaInput = !!document.querySelector('input[placeholder*="code"], input[name="code"], input[id*="code"], input[autocomplete="one-time-code"]');
      const isLoggedIn = href.includes('/catalog') || href.includes('/dashboard') || !!document.querySelector('.member-info, button[title*="Member"]');
      return hasMfaInput || isLoggedIn;
    }, { timeout: 300000 }); // 5 minutes window

    const currentUrl = page.url();
    const mfaSelector = 'input[placeholder*="code"], input[name="code"], input[id*="code"], input[autocomplete="one-time-code"]';
    
    if (await page.locator(mfaSelector).count() > 0 && !currentUrl.includes('/catalog') && !currentUrl.includes('/dashboard')) {
      is2faFound = true;
      console.log(`MFA_REQUIRED:${sessionId}`);
      
      // Read code from stdin
      const code = await new Promise<string>((resolve) => {
        rl.once('line', (line) => resolve(line.trim()));
      });

      console.log(`Received 2FA code. Filling into page...`);
      const mfaInput = page.locator(mfaSelector).first();
      await mfaInput.fill(code);
      
      // Find submit/verify button
      const verifyBtn = page.locator('button[type="submit"], button:has-text("Verify"), button:has-text("Confirm"), button:has-text("Submit")');
      await verifyBtn.first().click();
      await page.waitForTimeout(3000);
    }

    console.log('Waiting to reach Catalog or Dashboard page...');
    await page.waitForFunction(() => {
      const href = window.location.href;
      return href.includes('/catalog') || href.includes('/dashboard') || !!document.querySelector('a[href*="catalog"]');
    }, { timeout: 120000 });

    console.log('Successfully logged in! Navigating to Catalog/Works list...');
    if (!page.url().includes('/catalog')) {
      await page.goto('https://portal.themlc.com/catalog', { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    }

    // Wait for the works table or search area to appear
    console.log('Waiting for Catalog page elements to load...');
    await page.waitForSelector('table, [role="row"], .catalog-table', { state: 'visible', timeout: 45000 });

    // Try to click "100" results per page to reduce pagination steps
    console.log('Configuring table pagination (setting 100 items per page)...');
    try {
      const btn100 = page.locator('button:has-text("100"), span:has-text("100"), .results-per-page >> text=100').first();
      if (await btn100.count() > 0) {
        await btn100.click();
        console.log('Set 100 results per page, waiting for table reload...');
        await page.waitForTimeout(4000);
      }
    } catch (e) {
      console.log('Could not click 100 items per page button. Scraper will proceed anyway.');
    }

    console.log('Starting MLC catalog scrape...');
    const allWorks: any[] = [];
    let pageNum = 1;

    while (true) {
      console.log(`Scraping MLC works from page ${pageNum}...`);
      
      const pageWorks = await page.evaluate(() => {
        const songs: any[] = [];
        // First try selecting rows from table/grid
        const rows = Array.from(document.querySelectorAll('table tbody tr, [role="row"]'));
        
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td, [role="cell"]')).map(c => c.innerText.trim());
          if (cells.length >= 3) {
            const title = cells[0];
            const code = cells[1];
            const writers = cells[2];
            // Validate code is typical MLC song code (6 alphanumeric)
            if (title && code && code.match(/^[A-Z0-9]{6}$/) && writers) {
              songs.push({ title, songCode: code, writers });
            }
          }
        });

        // Fallback to body text split if table rows not matches
        if (songs.length === 0) {
          const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);
          for (let i = 0; i < lines.length - 2; i++) {
            const title = lines[i];
            const code = lines[i+1];
            const writers = lines[i+2];
            if (code.match(/^[A-Z0-9]{6}$/) && writers.includes(',') && !title.includes('%') && title.length < 100) {
              // Deduplicate immediately in list
              if (!songs.some(s => s.songCode === code)) {
                songs.push({ title, songCode: code, writers });
              }
            }
          }
        }
        return songs;
      });

      if (pageWorks.length > 0) {
        console.log(`Found ${pageWorks.length} works on page ${pageNum}.`);
        // Deduplicate and push
        for (const song of pageWorks) {
          if (!allWorks.some(s => s.songCode === song.songCode)) {
            allWorks.push(song);
          }
        }
      } else {
        console.log('No works found on this page.');
        break;
      }

      // Check pagination (FIRST, 1, 2, 3, LAST, NEXT)
      const nextBtn = page.locator('button:has-text("Next"), a:has-text("Next"), [aria-label="Next"], .pagination >> text=Next');
      if (await nextBtn.count() > 0 && await nextBtn.first().isEnabled()) {
        console.log('Navigating to next page...');
        await nextBtn.first().click();
        pageNum++;
        await page.waitForTimeout(4000);
      } else {
        console.log('No more pages. Scrape complete.');
        break;
      }
    }

    // Output results
    console.log(`DATA:${JSON.stringify({ type: 'mlc-catalog', data: allWorks })}`);
    console.log('Extraction complete. Closing browser...');

  } catch (err: any) {
    console.log(`❌ Error during MLC scrape: ${err.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
});
