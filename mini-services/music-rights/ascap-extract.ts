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

  const { username, password } = credentials;

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
    console.log('Navigating to ASCAP Member Portal...');
    await page.goto('https://ome.ascap.com/login', { waitUntil: 'domcontentloaded', timeout: 45000 });

    if (username && password) {
      console.log('Attempting to auto-fill ASCAP credentials...');
      try {
        const usernameInput = page.locator('input[type="text"], input[name="username"], input[name="userid"], input[placeholder*="sername"], input[placeholder*="Member ID"]');
        const passwordInput = page.locator('input[type="password"]');
        
        await usernameInput.first().waitFor({ state: 'visible', timeout: 10000 });
        await usernameInput.first().fill(username);
        await passwordInput.first().fill(password);
        console.log('Autofill complete. Please verify any CAPTCHAs and click Log In.');
      } catch (err: any) {
        console.log('Could not autofill login fields. Please fill manually.');
      }
    }

    console.log('Waiting for successful login and navigation to the Works Catalog page...');
    // Wait for the URL to change to the works list page, or look for the catalog table
    await page.waitForFunction(() => {
      return window.location.href.includes('#works') || !!document.querySelector('table');
    }, { timeout: 300000 }); // 5 minutes manual login window

    console.log('Logged in detected! Navigating to Works page if not already there...');
    if (!page.url().includes('#works')) {
      await page.goto('https://www.ascap.com/member-access#works?page=1', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    }

    // Give page time to load catalog list
    console.log('Waiting for Works table to render...');
    await page.waitForSelector('table', { state: 'visible', timeout: 30000 });

    console.log('Starting catalog scrape...');
    const allWorks: any[] = [];
    let pageNum = 1;

    while (true) {
      console.log(`Scraping works from page ${pageNum}...`);
      
      const pageWorks = await page.evaluate(() => {
        const table = document.querySelector('table');
        if (!table) return [];
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        return rows.map(row => {
          const cols = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());
          if (cols.length < 3) return null;

          // ASCAP table layout (varies by view config):
          //   [title, status, workId, created, ?iswc?, ?writers?, ?ipi?]
          const obj: Record<string, string> = {
            title: cols[0],
            status: cols[1],
            workId: cols[2],
            created: cols[3] || '',
          };

          // If there are more columns, try to extract ISWC and writers
          // ISWC matches pattern T-123.456.789-0
          for (let i = 4; i < cols.length; i++) {
            const val = cols[i];
            if (/^T-\d{3}\.\d{3}\.\d{3}/.test(val)) {
              obj.iswc = val;
            } else if (/^\d{9,11}$/.test(val)) {
              obj.ipi = val;
            } else if (val && val.length > 3 && val !== obj.title && !/^\d+$/.test(val)) {
              obj.writers = (obj.writers ? obj.writers + ', ' : '') + val;
            }
          }

          return obj;
        }).filter(Boolean);
      });

      if (pageWorks.length > 0) {
        console.log(`Found ${pageWorks.length} works on page ${pageNum}.`);
        allWorks.push(...pageWorks);
      } else {
        console.log('No works found on this page.');
        break;
      }

      // Check for pagination
      const nextBtn = page.locator('button:has-text("Next"), a:has-text("Next"), [aria-label="Next"], .pagination-next');
      if (await nextBtn.count() > 0 && await nextBtn.first().isEnabled()) {
        console.log('Navigating to next page...');
        await nextBtn.first().click();
        pageNum++;
        await page.waitForTimeout(3000); // Brief wait for contents to change
      } else {
        console.log('No more pages. Scrape complete.');
        break;
      }
    }

    // Output results
    console.log(`DATA:${JSON.stringify({ type: 'ascap-catalog', data: allWorks })}`);
    console.log('Extraction complete. Closing browser...');

  } catch (err: any) {
    console.log(`❌ Error during ASCAP scrape: ${err.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
});
