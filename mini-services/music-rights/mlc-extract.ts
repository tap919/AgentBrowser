// @ts-nocheck
import { chromium } from 'playwright';
import readline from 'readline';
import Imap from 'imap';
import { simpleParser } from 'mailparser';

// ─── Gmail MFA reader (inlined) ──────────────────────────────────────
interface GmailConfig { user: string; appPassword: string; }

function readMfaCode(config: GmailConfig, senderDomain: string, maxMs = 120000): Promise<string | null> {
  return new Promise((resolve) => {
    const imap = new Imap({
      user: config.user, password: config.appPassword,
      host: 'imap.gmail.com', port: 993, tls: true,
      tlsOptions: { rejectUnauthorized: false }, keepalive: false,
    });
    let done = false;
    const fallback = setTimeout(() => { if (!done) { done = true; imap.end(); resolve(null); } }, maxMs);
    const cleanup = (val: string | null) => { if (!done) { done = true; clearTimeout(fallback); imap.end(); resolve(val); } };
    imap.on('error', () => cleanup(null));
    imap.once('ready', () => {
      if (done) return;
      imap.openBox('INBOX', false, (err) => {
        if (err || done) return cleanup(null);
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        imap.search([['SINCE', yesterday], ['UNSEEN']], (err2, results) => {
          if (err2 || done) return cleanup(null);
          const uids = (results || []).slice(-5);
          if (uids.length === 0) return cleanup(null);
          const fetch = imap.fetch(uids, { bodies: '', markSeen: true });
          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream as any, (_err: any, parsed: any) => {
                if (_err || done) return;
                const from = (parsed.from?.value?.[0]?.address || '').toLowerCase();
                if (!from.includes(senderDomain.toLowerCase())) return;
                const text = (parsed.text || parsed.html || '').toLowerCase();
                const patterns = [
                  /(?:code|pin|otp|mfa|2fa|verification|one.time|auth)[:\s]*(\d{6})/i,
                  /(?:security code|account)[.\s]*(\d{6})/i,
                  /(\d{6})\s+is\s+(?:your\s+)?(?:code|pin|otp)/i,
                ];
                for (const p of patterns) { const m = text.match(p); if (m) cleanup(m[1]); }
              });
            });
          });
          fetch.once('end', () => cleanup(null));
        });
      });
    });
    imap.connect();
  });
}

async function pollMfaCode(config: GmailConfig, senderDomain: string, maxMs = 120000): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    console.log(`Polling Gmail for MFA code from ${senderDomain}...`);
    const code = await readMfaCode(config, senderDomain, 15000);
    if (code) { console.log(`Found MFA code: ${code}`); return code; }
    await new Promise(r => setTimeout(r, 5000));
  }
  return null;
}
// ──────────────────────────────────────────────────────────────────────

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
    console.log(`Error parsing input: ${err.message}`);
    process.exit(1);
  }

  const { email, password, sessionId, gmailUser, gmailAppPassword } = credentials;
  const gmailConfig = (gmailUser && gmailAppPassword) ? { user: gmailUser, appPassword: gmailAppPassword } : null;

  console.log('Launching browser (headless)...');
  const browser = await chromium.launch({
    headless: true,
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

    // Monitor network requests
    const apiRequests: any[] = [];
    page.on('request', req => {
      if (req.url().includes('api/security/token')) {
        apiRequests.push({ url: req.url(), method: req.method(), type: req.resourceType(), postData: req.postData()?.substring(0, 500) });
      } else {
        apiRequests.push({ url: req.url(), method: req.method(), type: req.resourceType() });
      }
    });
    page.on('response', async (resp) => {
  const url = resp.url();
  if (url.includes('api/security/token') || url.includes('login')) {
    const body = await resp.text().catch(() => '?');
    apiRequests.push({ url, status: resp.status(), body: body.substring(0, 500), type: resp.request().resourceType() });
  } else {
    apiRequests.push({ url, status: resp.status(), type: resp.request().resourceType() });
  }
});

    if (email && password) {
      console.log('Navigating to MLC login...');
      try {
        // Remove cookie consent dialog
        await page.evaluate(() => {
          const dialog = document.getElementById('CybotCookiebotDialog');
          if (dialog) dialog.remove();
          // Also try any cookie banners
          document.querySelectorAll('[class*="cookie"], [id*="cookie"], [class*="Cookie"], [id*="Cybot"]').forEach(e => e.remove());
        });
        await page.waitForTimeout(500);
        console.log('Removed cookie consent dialogs.');
        // Fallback: click accept if still visible
        const acceptCookies = page.locator('button:has-text("Allow all cookies")');
        if (await acceptCookies.count() > 0 && await acceptCookies.first().isVisible()) {
          await acceptCookies.first().click({ force: true, timeout: 5000 }).catch(() => {});
        }

        // Hide any overlays before they intercept clicks
        await page.waitForSelector('#username', { state: 'visible', timeout: 20000 });
        // Use type() instead of fill() to trigger React input events that enable the submit button
        await page.type('#username', email, { delay: 50 });
        await page.type('#password', password, { delay: 50 });
        await page.waitForTimeout(1000);
        const isDisabled = await page.evaluate(() => {
          const btn = document.querySelector('button[type="submit"]');
          return btn?.hasAttribute('disabled') || btn?.classList.contains('disabled');
        });
        console.log('Submit button disabled: ' + isDisabled);
        if (isDisabled) {
          await page.evaluate(() => {
            const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
            if (btn) { btn.disabled = false; btn.classList.remove('disabled'); }
          });
          await page.waitForTimeout(500);
        }
        // Hide any overlays before clicking
        await page.evaluate(() => {
          document.querySelectorAll('[id*="Cybot"], [id*="cookie"], [class*="cookie"], [class*="overlay"]').forEach(e => e.remove());
        });
        console.log('Submitting login form...');
        // Use Playwright's internal API request to bypass CORS
        const apiResult = await page.request.post('https://api.ptl.themlc.com/api/security/token', {
          data: { username: email, password },
          headers: { 'Content-Type': 'application/json', 'Origin': 'https://portal.themlc.com', 'Referer': 'https://portal.themlc.com/' },
        });
        const apiBody = await apiResult.text();
        console.log('Direct API call status: ' + apiResult.status() + ', body: ' + apiBody.substring(0, 500));
      } catch (err: any) {
        console.log('Auto-login issue: ' + err.message);
      }
    }

    // Check for MFA code input
    const mfaSelector = 'input[autocomplete="one-time-code"], input[placeholder*="code" i], input[id*="code" i], input[name*="code" i]';
    const mfaInput = page.locator(mfaSelector);

    try {
      await mfaInput.first().waitFor({ state: 'visible', timeout: 15000 });
      console.log('MFA code input detected!');
      if (gmailConfig) {
        console.log('Reading MFA code from Gmail...');
        const code = await pollMfaCode(gmailConfig, 'themlc.com', 120000);
          if (code) {
            await mfaInput.first().fill(code);
            console.log('MFA code filled. Submitting...');
            const verifyBtn = page.locator('button[type="submit"], button:has-text("Verify"), button:has-text("Confirm")');
            if (await verifyBtn.first().isVisible().catch(() => false)) {
              await verifyBtn.first().click();
            } else {
              await page.keyboard.press('Enter');
            }
            await page.waitForTimeout(3000);
          } else {
          console.log('Could not auto-read MFA code from Gmail.');
        }
      } else {
        console.log(`MFA_REQUIRED:${sessionId}`);
        console.log('Waiting for manual MFA code entry via stdin...');
        const code = await new Promise<string>((resolve) => { rl.once('line', (line) => resolve(line.trim())); });
        await mfaInput.first().fill(code);
        const verifyBtn = page.locator('button[type="submit"], button:has-text("Verify"), button:has-text("Confirm")');
        await verifyBtn.first().click();
        await page.waitForTimeout(3000);
      }
    } catch {
      console.log('No MFA input detected (or already logged in).');
    }

    // Wait for catalog/dashboard
    const currentUrl = page.url();
    console.log('Current URL: ' + currentUrl);

    if (currentUrl.includes('/login')) {
      console.log('Still on login page — retrying or waiting...');
      try {
        await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 60000 });
      } catch {}
    }

    // Navigate to catalog
    console.log('Waiting to reach Catalog...');
    await page.waitForFunction(() => {
      return window.location.href.includes('/catalog') || window.location.href.includes('/dashboard');
    }, { timeout: 120000 });

    if (!page.url().includes('/catalog')) {
      await page.goto('https://portal.themlc.com/catalog', { waitUntil: 'networkidle', timeout: 45000 });
    }

    console.log('Waiting for Catalog table...');
    await page.waitForSelector('table tbody tr', { state: 'attached', timeout: 45000 });

    // Scrape all songs
    console.log('Starting MLC catalog scrape...');
    const allSongs: any[] = [];
    let pageNum = 1;

    while (true) {
      console.log(`Scraping MLC page ${pageNum}...`);
      const pageWorks = await page.evaluate(() => {
        const songs: any[] = [];
        const rows = Array.from(document.querySelectorAll('table tbody tr, [role="row"]'));
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td, [role="cell"]')).map(c => (c as HTMLElement).innerText.trim());
          if (cells.length >= 3) {
            const title = cells[0];
            const code = cells[1];
            const writers = cells[2];
            if (title && code && code.match(/^[A-Z0-9]{6}$/) && writers) {
              const obj: Record<string, string> = { title, songCode: code, writers };
              for (let i = 3; i < cells.length; i++) {
                const val = cells[i];
                if (/^[A-Z]{2}-[A-Z0-9]{3}-\d{2}-\d{5}$/.test(val)) obj.isrc = val;
                else if (/^T-\d{3}\.\d{3}\.\d{3}/.test(val)) obj.iswc = val;
                else if (/^\d{9,11}$/.test(val)) obj.ipi = val;
                else if (val && val.length > 2 && !/^[A-Z0-9]{6}$/.test(val) && val !== title) {
                  if (!obj.writersExtended) obj.writersExtended = val;
                  else if (!obj.artistName) obj.artistName = val;
                  else if (!obj.albumTitle) obj.albumTitle = val;
                }
              }
              songs.push(obj);
            }
          }
        });
        return songs;
      });

      if (pageWorks.length > 0) {
        console.log(`Found ${pageWorks.length} songs on page ${pageNum}.`);
        allSongs.push(...pageWorks);
      } else {
        console.log('No songs found on this page — done.');
        break;
      }

      const nextBtn = page.locator('button:has-text("Next"), [aria-label="Next"], .pagination-next');
      if (await nextBtn.count() > 0 && await nextBtn.first().isEnabled()) {
        await nextBtn.first().click();
        pageNum++;
        await page.waitForTimeout(3000);
      } else {
        break;
      }
    }

    console.log(`DATA:${JSON.stringify({ type: 'mlc-catalog', data: allSongs })}`);
    console.log('MLC extraction complete.');

  } catch (err: any) {
    const url = page.url();
    const title = await page.title().catch(() => 'unknown');
    console.log(`Error during MLC scrape: ${err.message}`);
    console.log(`URL: ${url}, title: ${title}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
});
