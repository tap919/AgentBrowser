import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { apiAuthMiddleware } from '@/lib/api-auth-middleware';

// Next.js hot-reload safe global session map
const globalForSessions = global as unknown as {
  musicRightsSessions?: Map<string, {
    resolveMfa?: (code: string) => void;
  }>;
};

export const sessions = globalForSessions.musicRightsSessions ?? new Map<string, {
  resolveMfa?: (code: string) => void;
}>();
if (process.env.NODE_ENV !== 'production') {
  globalForSessions.musicRightsSessions = sessions;
}

// GET handler to retrieve cached/local files
async function getHandler(req: Request) {
  const { searchParams } = new URL(req.url);
  const cached = searchParams.get('cached');

  if (cached === 'true') {
    try {
      const ascapPath = path.join(process.cwd(), 'ascap_data.json');
      const mlcPath = path.join(process.cwd(), 'mlc_data.json');
      const mergedPath = path.join(process.cwd(), 'merged_catalog.json');

      const ascap = fs.existsSync(ascapPath) ? JSON.parse(fs.readFileSync(ascapPath, 'utf8')) : [];
      const mlc = fs.existsSync(mlcPath) ? JSON.parse(fs.readFileSync(mlcPath, 'utf8')) : [];
      const merged = fs.existsSync(mergedPath) ? JSON.parse(fs.readFileSync(mergedPath, 'utf8')) : [];

      return NextResponse.json({ ascap, mlc, merged });
    } catch (err: unknown) {
      return NextResponse.json({ error: `Failed to load cached data: ${err instanceof Error ? err.message : 'Unknown error'}` }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

// Helper to run a Playwright child process and stream output
function runAutomationScript(
  scriptName: string,
  inputData: unknown,
  onLog: (msg: string) => void,
  onData: (type: string, data: unknown) => Promise<void> | void,
  onMfaRequired?: (sessionId: string) => Promise<string>
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'mini-services', 'music-rights', scriptName);
    
    onLog(`Spawning subprocess: ts-node ${scriptName}...`);
    const nodeDir = path.dirname(process.execPath);
    const npxPath = path.join(nodeDir, 'npx.cmd');
    const proc = spawn(
      'cmd.exe',
      ['/c', npxPath, 'ts-node', scriptPath],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );

    // Send credentials/input via stdin
    proc.stdin.write(JSON.stringify(inputData) + '\n');

    let buffer = '';
    let returnedData: any = null;

    proc.stdout.on('data', async (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;

        if (cleanLine.startsWith('MFA_REQUIRED:')) {
          const sessionId = cleanLine.split(':')[1];
          onLog(`⚠️ MLC requires MFA. Pausing script for Session ID: ${sessionId}`);
          
          if (onMfaRequired) {
            try {
              const code = await onMfaRequired(sessionId);
              onLog(`Relaying verification code to subprocess stdin...`);
              proc.stdin.write(code + '\n');
            } catch (err: unknown) {
              proc.kill();
              reject(new Error(`MFA relay failed: ${err instanceof Error ? err.message : 'Unknown error'}`));
            }
          } else {
            proc.kill();
            reject(new Error('MFA required but no handler provided.'));
          }
        } else if (cleanLine.startsWith('DATA:')) {
          try {
            const payload = JSON.parse(cleanLine.slice(5));
            returnedData = payload;
            if (payload.type) {
              const result = onData(payload.type, payload.data);
              if (result instanceof Promise) await result;
            }
          } catch (e) {
            onLog(`[Data Parse Error] ${cleanLine}`);
          }
        } else {
          onLog(cleanLine);
        }
      }
    });

    proc.stderr.on('data', (chunk) => {
      const errText = chunk.toString().trim();
      if (errText) {
        onLog(`[stderr] ${errText}`);
      }
    });

    proc.on('close', (code) => {
      onLog(`Subprocess closed with exit code ${code}`);
      if (code === 0) {
        resolve(returnedData);
      } else {
        reject(new Error(`Automation script exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      onLog(`Subprocess spawn error: ${err.message}`);
      reject(err);
    });
  });
}

// POST handler for SSE streaming
async function postHandler(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 });
  }

  const { action } = body;
  const sessionId = Math.random().toString(36).slice(2, 9);

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();
  let writerClosed = false;

  const safeCloseWriter = async () => {
    if (writerClosed) return;
    writerClosed = true;
    try { await writer.close(); } catch { /* ignore close errors */ }
  };

  const sendEvent = async (type: string, payload: Record<string, unknown>) => {
    if (writerClosed) return;
    try {
      const data = JSON.stringify({ type, ...payload });
      await writer.write(encoder.encode(`data: ${data}\n\n`));
    } catch { /* ignore send errors after close */ }
  };

  const logToClient = async (msg: string) => {
    await sendEvent('log', { message: msg });
  };

  // Run the async orchestration worker with proper error isolation
  const workerPromise = (async () => {
    try {
      if (action === 'extract') {
        const ascapUser = (body.ascapUser as string) || process.env.ASCAP_USERNAME || '';
        const ascapPass = (body.ascapPass as string) || process.env.ASCAP_PASSWORD || '';
        const mlcEmail = (body.mlcEmail as string) || process.env.MLC_EMAIL || '';
        const mlcPass = (body.mlcPass as string) || process.env.MLC_PASSWORD || '';
        const gmailUserAscap = (body.gmailUserAscap as string) || process.env.GMAIL_USER_ASCAP || 'ncsound919@gmail.com';
        const gmailAppPasswordAscap = (body.gmailAppPasswordAscap as string) || process.env.GMAIL_APP_PASSWORD_ASCAP || '';
        const gmailUserMlc = (body.gmailUserMlc as string) || process.env.GMAIL_USER_MLC || 'tap45000@gmail.com';
        const gmailAppPasswordMlc = (body.gmailAppPasswordMlc as string) || process.env.GMAIL_APP_PASSWORD_MLC || '';

        await sendEvent('session', { sessionId });
        await logToClient(`Session created. ID: ${sessionId}`);

        // 1. ASCAP Extraction
        await logToClient('Phase 1: Scraping ASCAP Member Portal...');
        let ascapSongs: unknown[] = [];
        try {
          await runAutomationScript(
            'ascap-extract.ts',
            { username: ascapUser, password: ascapPass, gmailUser: gmailUserAscap, gmailAppPassword: gmailAppPasswordAscap },
            logToClient,
            async (type, data: unknown) => {
              if (type === 'ascap-catalog') {
                ascapSongs = data as unknown[];
                await sendEvent('ascap-data', { data });
              }
            }
          );
          await logToClient(`ASCAP catalog retrieved: ${ascapSongs.length} works.`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          await logToClient(`ASCAP extraction failed: ${msg}. Proceeding to MLC...`);
        }

        // 2. MLC Extraction
        await logToClient('Phase 2: Scraping The MLC Portal...');
        let mlcSongs: unknown[] = [];
        try {
          await runAutomationScript(
            'mlc-extract.ts',
            { email: mlcEmail, password: mlcPass, sessionId, gmailUser: gmailUserMlc, gmailAppPassword: gmailAppPasswordMlc },
            logToClient,
            async (type, data: unknown) => {
              if (type === 'mlc-catalog') {
                mlcSongs = data as unknown[];
                await sendEvent('mlc-data', { data });
              }
            },
            async (sid: string) => {
              return new Promise<string>((resolveMfa, rejectMfa) => {
                const timeoutId = setTimeout(() => {
                  sessions.delete(sid);
                  rejectMfa(new Error('MFA verification timed out after 5 minutes'));
                }, 300000);
                sessions.set(sid, {
                  resolveMfa: (code: string) => {
                    clearTimeout(timeoutId);
                    sessions.delete(sid);
                    resolveMfa(code);
                  }
                });
                sendEvent('mfa-required', { sessionId: sid });
              });
            }
          );
          await logToClient(`MLC catalog retrieved: ${mlcSongs.length} works.`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          await logToClient(`MLC extraction failed: ${msg}.`);
        }

        // 3. Merging and Consolidation
        await logToClient('Phase 3: Consolidating and Deduplicating Catalogs...');
        const merged = mergeCatalogs(ascapSongs as Record<string, unknown>[], mlcSongs as Record<string, unknown>[]);

        fs.writeFileSync(path.join(process.cwd(), 'ascap_data.json'), JSON.stringify(ascapSongs, null, 2));
        fs.writeFileSync(path.join(process.cwd(), 'mlc_data.json'), JSON.stringify(mlcSongs, null, 2));
        fs.writeFileSync(path.join(process.cwd(), 'merged_catalog.json'), JSON.stringify(merged, null, 2));

        await logToClient('Cache files successfully updated in workspace.');
        await sendEvent('merged-data', { data: merged });

      } else if (action === 'upload') {
        const hfaEmail = body.hfaEmail as string;
        const hfaPass = body.hfaPass as string;
        const publisherName = body.publisherName as string;
        const publisherIpi = body.publisherIpi as string;
        const publisherPNumber = body.publisherPNumber as string || process.env.HFA_PUBLISHER_NUMBER || '';
        const catalog = body.catalog as Record<string, unknown>;

        await logToClient('Starting HFA bulk upload session...');

        const submissionRef: { current: Record<string, unknown> | null } = { current: null };
        await runAutomationScript(
          'hfa-upload.ts',
          { email: hfaEmail, password: hfaPass, publisherName, publisherIpi, publisherPNumber, catalog },
          logToClient,
          (type, data) => {
            if (type === 'hfa-submission') {
              submissionRef.current = data as Record<string, unknown>;
            }
          }
        );

        const subResult = submissionRef.current;
        if (subResult && subResult.success) {
          await sendEvent('success', {
            submissionId: subResult.submissionId as string,
            xlsxBase64: subResult.xlsxBase64 as string
          });
        } else {
          throw new Error('HFA upload completed but failed to capture submission reference.');
        }
      }

      await safeCloseWriter();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      try { await sendEvent('error', { message: msg }); } catch { /* ignore */ }
      await safeCloseWriter();
    }
  })();

  // Don't await worker - it runs in background streaming to client
  // But catch any unhandled rejections
  workerPromise.catch(() => { /* worker errors handled internally */ });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

interface CatalogSong {
  title: string | null;
  workId?: string | null;
  ascapId?: string | null;
  songCode?: string | null;
  mlcCode?: string | null;
  writers?: string | string[] | null;
  created?: string | null;
  // HFA-enrichment fields
  iswc?: string | null;
  isrc?: string | null;
  ipi?: string | null;
  artistName?: string | null;
  albumTitle?: string | null;
  publisherName?: string | null;
}

function mergeCatalogs(ascap: Record<string, unknown>[], mlc: Record<string, unknown>[]) {
  const merged: CatalogSong[] = [];
  const mlcIndex = new Map<string, CatalogSong>();

  for (const raw of mlc) {
    const song = raw as unknown as CatalogSong;
    if (song.title) {
      mlcIndex.set(song.title.toLowerCase(), song);
    }
  }

  for (const raw of ascap) {
    const song = raw as unknown as CatalogSong;
    const key = song.title?.toLowerCase() ?? '';
    const match = key ? mlcIndex.get(key) : undefined;
    merged.push({
      title: song.title ?? null,
      ascapId: song.workId ?? null,
      mlcCode: match?.songCode ?? null,
      writers: match?.writers ?? song.writers ?? null,
      created: song.created ?? null,
      // HFA enrichment — prefer MLC ISRC if matched, else ASCAP
      iswc: song.iswc ?? null,
      isrc: match?.isrc ?? null,
      ipi: song.ipi ?? null,
      artistName: match?.artistName ?? null,
      albumTitle: match?.albumTitle ?? null,
    });
    if (match && key) {
      mlcIndex.delete(key);
    }
  }

  for (const [, song] of mlcIndex) {
    merged.push({
      title: song.title ?? null,
      ascapId: null,
      mlcCode: song.songCode ?? null,
      writers: song.writers ?? null,
      created: null,
      iswc: null,
      isrc: song.isrc ?? null,
      ipi: null,
      artistName: song.artistName ?? null,
      albumTitle: song.albumTitle ?? null,
    });
  }

  return merged;
}

export const GET = apiAuthMiddleware(getHandler);
export const POST = apiAuthMiddleware(postHandler);
