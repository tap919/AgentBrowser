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

  const { username, password, gmailUser, gmailAppPassword } = credentials;
  const gmailConfig = (gmailUser && gmailAppPassword) ? { user: gmailUser, appPassword: gmailAppPassword } : null;

  console.log('Launching real Chrome...');
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('Navigating to ASCAP Member Portal...');
    await page.goto('https://www.ascap.com/member-access', { waitUntil: 'networkidle', timeout: 45000 });

    if (username && password) {
      console.log('Waiting for login form...');
      try {
        console.log('Making overlays non-interactive...');
        await page.evaluate(() => {
          document.querySelectorAll('[class*="truste"], [id*="truste"], [class*="overlay"], [class*="popup"], [class*="modal"]').forEach(e => {
            (e as HTMLElement).style.pointerEvents = 'none';
            (e as HTMLElement).style.display = 'none';
          });
        });
        await page.waitForTimeout(500);

        await page.waitForSelector('#username', { state: 'visible', timeout: 30000 });
        await page.fill('#username', username);
        await page.fill('#password', password);
        console.log('Clicking LOG IN button...');
        // Try normal click first (not force) — dispatches proper mouse events
        await page.click('#submitButton', { timeout: 15000 }).catch(async () => {
          console.log('Normal click failed, trying force click...');
          await page.click('#submitButton', { force: true, timeout: 10000 });
        });
        await page.waitForTimeout(3000);
        console.log('After login click, URL: ' + page.url());
      } catch (err: any) {
        console.log('Auto-login issue: ' + err.message);
      }
    }

    // Wait for MFA challenge or successful login
    await page.waitForTimeout(2000);

    // Check for MFA challenge (radio buttons to select contact method)
    const mfaContinueBtn = page.locator('.js-continue-mfa');
    try {
      await mfaContinueBtn.first().waitFor({ state: 'visible', timeout: 15000 });
      console.log('MFA challenge detected!');
      // Select email contact method (first radio button)
      const emailRadio = page.locator('#contact-selection-0');
      if (await emailRadio.count() > 0) {
        await emailRadio.check({ force: true });
        console.log('Selected email contact method.');
      }
      // Click Continue to send MFA code
      await mfaContinueBtn.first().click();
      console.log('Clicked Continue. Waiting for code input...');
      // Pre-scan: mark all existing ASCAP emails as seen so UNSEEN only finds the new one
      if (gmailConfig) {
        await new Promise<void>((resolve) => {
          const imap = new Imap({
            user: gmailConfig!.user, password: gmailConfig!.appPassword,
            host: 'imap.gmail.com', port: 993, tls: true,
            tlsOptions: { rejectUnauthorized: false }, keepalive: false,
          });
          imap.on('error', () => resolve());
          imap.once('ready', () => {
            imap.openBox('INBOX', false, () => {
              const yesterday = new Date(Date.now() - 86400000).toDateString();
              imap.search([['SINCE', yesterday], ['UNSEEN']], (_, results) => {
                const uids = (results || []).filter(u => u > 0);
                if (uids.length > 0) {
                  imap.addFlags(uids, ['\\Seen'], () => { imap.end(); resolve(); });
                } else { imap.end(); resolve(); }
              });
            });
          });
          imap.connect();
        });
        console.log('Pre-marked old ASCAP emails as seen.');
      }
      await page.waitForTimeout(3000);

      // Now wait for code input field
      const codeInput = page.locator('input[autocomplete="one-time-code"], input[placeholder*="code" i], input[name*="code" i]');
      try {
        await codeInput.first().waitFor({ state: 'visible', timeout: 30000 });
        console.log('MFA code input field appeared!');
        if (gmailConfig) {
          console.log('Reading MFA code from Gmail...');
          const code = await pollMfaCode(gmailConfig, 'ascap.com', 120000);
          if (code) {
            await codeInput.first().fill(code);
            console.log('MFA code filled. Looking for submit button...');
            const hashBefore = await page.evaluate(() => window.location.hash);
            console.log('Hash before verify: ' + hashBefore);
            const verifyBtn = page.locator('button[type="submit"], button:has-text("Verify"), button:has-text("Submit"), button:has-text("Confirm"), input[type="submit"]');
            const btnCount = await verifyBtn.count();
            console.log(`Found ${btnCount} submit buttons.`);
            let clicked = false;
            for (let i = 0; i < btnCount; i++) {
              const btn = verifyBtn.nth(i);
              if (await btn.isVisible().catch(() => false)) {
                console.log(`Button ${i} text: ${await btn.textContent().catch(() => '?')}, visible`);
                await btn.click();
                clicked = true;
                break;
              }
            }
            if (!clicked) {
              console.log('No visible button found, pressing Enter...');
              await page.keyboard.press('Enter');
            }
            await page.waitForTimeout(5000);
            const hashAfter = await page.evaluate(() => window.location.hash);
            console.log('Hash after verify: ' + hashAfter);
            const htmlDump = await page.evaluate(() => document.body?.innerText?.substring(0, 3000) || 'no body');
            console.log('Page text after verify:');
            console.log(htmlDump);
          } else {
            console.log('Could not auto-read MFA code from Gmail.');
          }
        } else {
          console.log('No Gmail config — waiting for manual code entry...');
          await page.waitForTimeout(120000);
        }
      } catch {
        console.log('No code input appeared after sending MFA.');
      }
    } catch {
      console.log('No MFA challenge detected - proceeding directly.');
    }

    console.log('Clicking Works in sidebar...');
    try {
      const worksLink = page.locator('a[href*="works"], a:has-text("Works")');
      await worksLink.first().click({ timeout: 10000 });
      await page.waitForTimeout(3000);
    } catch (e: any) {
      console.log('Could not click Works link: ' + e.message + '. Navigating directly...');
      await page.goto('https://www.ascap.com/member-access#works?page=1', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3000);
    }
    console.log('URL after Works navigation: ' + (await page.evaluate(() => window.location.hash)));
    console.log('Waiting for Works table...');
    await page.waitForSelector('table tbody tr', { state: 'attached', timeout: 30000 });

    // Scrape all works
    console.log('Starting catalog scrape...');
    const allWorks: any[] = [];
    let pageNum = 1;

    while (true) {
      console.log(`Scraping page ${pageNum}...`);
      const pageWorks = await page.evaluate(() => {
        const table = document.querySelector('table');
        if (!table) return [];
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        return rows.map(row => {
          const cols = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());
          if (cols.length < 3) return null;
          const obj: Record<string, string> = { title: cols[0] || '' };
          const wId = cols[2]?.trim();
          if (wId && /^\d+$/.test(wId)) obj.workId = wId;
          if (cols[1]) {
            const st = cols[1].split('\n')[0]?.trim();
            if (st) obj.status = st;
          }
          if (cols[3] && /^[\d/]+$/.test(cols[3])) obj.created = cols[3];
          // Check cols[4] onward for ISWC/IPI (skip mobile-duplicate cells)
          for (let i = 4; i < cols.length; i++) {
            const val = cols[i];
            if (!val || val.length < 5) continue;
            if (/^T-\d{3}\.\d{3}\.\d{3}/.test(val)) { obj.iswc = val; break; }
            if (/^\d{9,11}$/.test(val) && val !== obj.workId) { obj.ipi = val; break; }
          }
          return obj;
        }).filter(w => w.title && w.workId) as Record<string, string>[];
      });

      if (pageWorks.length > 0) {
        console.log(`Found ${pageWorks.length} works on page ${pageNum}.`);
        allWorks.push(...pageWorks);
      } else {
        console.log('No works on this page — done.');
        break;
      }

      const nextBtn = page.locator('button:has-text("Next"), a:has-text("Next"), [aria-label="Next"], .pagination-next');
      if (await nextBtn.count() > 0 && await nextBtn.first().isEnabled()) {
        await nextBtn.first().click();
        pageNum++;
        await page.waitForTimeout(3000);
      } else {
        break;
      }
    }

    console.log(`DATA:${JSON.stringify({ type: 'ascap-catalog', data: allWorks })}`);
    console.log('ASCAP extraction complete.');

  } catch (err: any) {
    const url = page.url();
    const title = await page.title().catch(() => 'unknown');
    console.log(`Error during ASCAP scrape: ${err.message}`);
    console.log(`URL: ${url}, title: ${title}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
});
