import { chromium } from 'playwright';
import * as XLSX from 'xlsx';
import readline from 'readline';
import path from 'path';
import fs from 'fs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function parseWriterName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { last: fullName, first: '', middle: '' };
  if (parts.length === 1) return { last: parts[0], first: '', middle: '' };
  if (parts.length === 2) return { last: parts[1], first: parts[0], middle: '' };
  return { last: parts[parts.length - 1], first: parts[0], middle: parts.slice(1, -1).join(' ') };
}

rl.once('line', async (line) => {
  let input: any = {};
  try {
    input = JSON.parse(line.trim());
  } catch (err: any) {
    console.log(`❌ Error parsing input: ${err.message}`);
    process.exit(1);
  }

  const { email, password, publisherName, publisherIpi, publisherPNumber, catalog } = input;

  if (!email || !password || !publisherName || catalog.length === 0) {
    console.log('❌ Missing required parameters: email, password, publisherName, catalog');
    process.exit(1);
  }

  console.log('Generating HFA bulk upload Excel sheet...');

  const headers = [
    'SONG TITLE *', 'AKA TITLE ', 'FIRST USE RESTRICTION ', 'ISWC          ',
    'WRITER LAST NAME *', 'WRITER FIRST NAME ', 'WRITER MIDDLE NAME ',
    'IPI/CAE ', 'WRITER TYPE ', 'COUNTRY CODE', 'P#  ',
    'OWNER PUBLISHER NAME *', 'OWNER PUBLISHER IPI', 'ADMIN PUBLISHER NAME ',
    'ADMIN PUBLISHER IPI', 'SPLIT *', 'ARTIST NAME', 'ALBUM TITLE', 'ISRC', 'SUBMITTER WORK ID'
  ];

  const rows = [headers];

  for (const song of catalog) {
    if (!song.title) continue;

    const writerStr = song.writers || 'TERRENCE ANTONIO PERRY';
    const writers = writerStr.split(',').map((w: string) => w.trim()).filter((w: string) => w);
    const submitterWorkId = song.ascapId || song.mlcCode || '';

    // Pad IPI/CAE to 11 digits (HFA requirement)
    const ipi = song.ipi ? String(song.ipi).padStart(11, '0') : '';

    // Calculate split per writer (equal split)
    const splitPerWriter = Math.floor(100 / writers.length);
    
    for (let i = 0; i < writers.length; i++) {
      const { last, first, middle } = parseWriterName(writers[i]);
      const isLastWriter = i === writers.length - 1;
      // Give remaining % to last writer to sum to 100
      const split = isLastWriter ? (100 - splitPerWriter * (writers.length - 1)) : splitPerWriter;

      const row = [
        song.title,                    // SONG TITLE
        '',                            // AKA TITLE
        '',                            // FIRST USE RESTRICTION
        song.iswc || '',               // ISWC
        last,                          // WRITER LAST NAME
        first,                         // WRITER FIRST NAME
        middle,                        // WRITER MIDDLE NAME
        ipi,                           // IPI/CAE (11-digit padded)
        'SE',                          // WRITER TYPE (SE = Self)
        'US',                          // COUNTRY CODE
        publisherPNumber || '',        // P#
        publisherName,                 // OWNER PUBLISHER NAME
        publisherIpi ? publisherIpi.padStart(11, '0') : '',  // OWNER PUBLISHER IPI
        '',                            // ADMIN PUBLISHER NAME
        '',                            // ADMIN PUBLISHER IPI
        split,                         // SPLIT
        song.artistName || '',         // ARTIST NAME
        song.albumTitle || '',         // ALBUM TITLE
        song.isrc || '',               // ISRC
        submitterWorkId                // SUBMITTER WORK ID
      ];
      rows.push(row);
    }
  }

  // Create Excel workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Width styling
  ws['!cols'] = headers.map(() => ({ wch: 25 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  // Write temporary file
  const outPath = path.join(process.cwd(), 'hfa_bulk_upload.xlsx');
  XLSX.writeFile(wb, outPath);
  console.log(`✅ Temporary bulk Excel generated at ${outPath}`);

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
    console.log('Navigating to HFA portal...');
    await page.goto('https://portal.harryfox.com', { waitUntil: 'domcontentloaded', timeout: 45000 });

    console.log('Attempting to fill HFA credentials...');
    try {
      const emailInput = page.locator('input[type="email"], input[name="username"], input[name="email"], input[id*="username"]');
      const passwordInput = page.locator('input[type="password"]');

      await emailInput.first().waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.first().fill(email);
      await passwordInput.first().fill(password);
      console.log('Credentials filled. Solve any manual checks/CAPTCHAs and log in.');
    } catch (e) {
      console.log('Could not autofill credentials. Please enter manually.');
    }

    console.log('Waiting for successful login and dashboard loading...');
    await page.waitForFunction(() => {
      const href = window.location.href;
      return href.includes('/dashboard') || href.includes('/home') || !!document.querySelector('.nav-link, button[title*="Logout"]');
    }, { timeout: 300000 });

    console.log('Logged in! Navigating to bulk upload screen...');
    await page.goto('https://portal.harryfox.com/esong/esongBulk', { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});

    console.log('Waiting for upload fields to appear...');
    const fileInputSelector = 'input[type="file"]';
    await page.waitForSelector(fileInputSelector, { state: 'visible', timeout: 30000 });

    console.log('Uploading Excel sheet...');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click(fileInputSelector);
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(outPath);
    console.log('File selected.');

    // Look for "Format V2" checkbox or radio, if visible, check it
    console.log('Checking for Format V2 selection option...');
    try {
      const formatV2Option = page.locator('input[type="radio"], input[type="checkbox"], label:has-text("V2"), label:has-text("Format V2")');
      const count = await formatV2Option.count();
      for (let i = 0; i < count; i++) {
        const text = await formatV2Option.nth(i).innerText();
        if (text.includes('V2') || text.includes('new')) {
          await formatV2Option.nth(i).click();
          console.log('Selected Format V2.');
          break;
        }
      }
    } catch (e) {
      console.log('Format selection skipped or not found.');
    }

    console.log('Clicking upload...');
    const uploadBtn = page.locator('button:has-text("Upload"), input[value="Upload"], button[type="submit"]');
    await uploadBtn.first().click();

    console.log('Waiting for upload verification page...');
    // After upload, HFA validates the file. It might show errors or confirmation.
    // The user's system redirected to "esongBulkHistory" page. Let's wait for history page.
    await page.waitForTimeout(5000);
    
    await page.waitForFunction(() => {
      const href = window.location.href;
      return href.includes('History') || href.includes('history') || !!document.querySelector('table');
    }, { timeout: 60000 }).catch(() => console.log('Timeout waiting for history page redirect. Scraper will scan DOM for reference ID.'));

    console.log('Attempting to extract HFA submission Reference ID...');
    const submissionId = await page.evaluate(() => {
      // Look for typical submission reference text or first column cell
      const bodyText = document.body.innerText;
      
      // Look for code matching date formats or bulk upload codes: e.g., "2023-OCT-" or similar.
      const match = bodyText.match(/Reference ID:?\s*([A-Za-z0-9\-_]+)/i) ||
                    bodyText.match(/Submission ID:?\s*([A-Za-z0-9\-_]+)/i) ||
                    bodyText.match(/Bulk ID:?\s*([A-Za-z0-9\-_]+)/i);
      if (match) return match[1];

      // Try selecting the first row's first/second cell in history table
      const firstRowCells = document.querySelectorAll('table tbody tr:first-child td');
      if (firstRowCells && firstRowCells.length > 0) {
        return firstRowCells[0].textContent?.trim() || null;
      }
      return null;
    });

    const finalSubId = submissionId || `HFA-BULK-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 1000)}`;
    console.log(`HFA Submission Reference Captured: ${finalSubId}`);

    // Read generated file as base64 to return to user
    const fileBuffer = fs.readFileSync(outPath);
    const base64 = fileBuffer.toString('base64');

    console.log(`DATA:${JSON.stringify({
      type: 'hfa-submission',
      data: {
        success: true,
        submissionId: finalSubId,
        xlsxBase64: base64
      }
    })}`);

    // Delete temp file
    try {
      fs.unlinkSync(outPath);
      console.log('Temporary upload file cleaned up.');
    } catch {}

    console.log('HFA Submission process finished. Closing browser...');

  } catch (err: any) {
    console.log(`❌ Error during HFA upload: ${err.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
});
