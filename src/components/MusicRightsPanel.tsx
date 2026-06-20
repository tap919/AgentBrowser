'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Music, Shield, Key, FileText, CheckCircle2, ChevronRight,
  Download, AlertTriangle, Loader2, Play, RefreshCw, Trash2, Check, ArrowRight,
  Lock, Sparkles
} from 'lucide-react';

interface Song {
  title: string;
  ascapId: string | null;
  mlcCode: string | null;
  writers: string | null;
  created?: string | null;
  checked?: boolean;
  iswc?: string | null;
  isrc?: string | null;
  ipi?: string | null;
  artistName?: string | null;
  albumTitle?: string | null;
}

type Step = 1 | 2 | 3 | 4;

export default function MusicRightsPanel() {
  const [step, setStep] = useState<Step>(1);
  
  // Credentials state
  const [ascapUser, setAscapUser] = useState('');
  const [ascapPass, setAscapPass] = useState('');
  const [mlcEmail, setMlcEmail] = useState('');
  const [hfaEmail, setHfaEmail] = useState('');
  const [hfaPass, setHfaPass] = useState('');

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [isSubmittingMfa, setIsSubmittingMfa] = useState(false);

  // Extracted catalog
  const [catalog, setCatalog] = useState<Song[]>([]);
  const [publisherName, setPublisherName] = useState('');
  const [publisherIpi, setPublisherIpi] = useState('');
  const [publisherPNumber, setPublisherPNumber] = useState('');

  // Raw data from extraction
  const [ascapRaw, setAscapRaw] = useState<any[]>([]);
  const [mlcRaw, setMlcRaw] = useState<any[]>([]);
  const [xlsxBase64, setXlsxBase64] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Step 1: Start catalog extraction
  const handleStartExtraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ascapUser || !ascapPass || !mlcEmail) {
      toast.error('Please provide ASCAP username/password and MLC email.');
      return;
    }

    setStep(2);
    setIsRunning(true);
    setLogs([]);
    setMfaRequired(false);
    setSessionId(null);
    setCatalog([]);
    
    addLog('Initiating Music Rights Extraction API connection...');

    try {
      const response = await fetch('/api/music-rights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extract',
          ascapUser,
          ascapPass,
          mlcEmail
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No readable response stream.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last partial line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine || !cleanLine.startsWith('data: ')) continue;
          
          try {
            const event = JSON.parse(cleanLine.slice(6));
            
            if (event.type === 'log') {
              addLog(event.message);
            } else if (event.type === 'session') {
              setSessionId(event.sessionId);
              addLog(`Session registered: ${event.sessionId}`);
            } else if (event.type === 'mfa-required') {
              setMfaRequired(true);
              setSessionId(event.sessionId);
              addLog('⚠️ MLC Multi-Factor Authentication (MFA) required. Check your email/phone and enter the code below.');
              toast.warning('2FA Verification Required for MLC');
            } else if (event.type === 'ascap-data') {
              setAscapRaw(event.data);
              addLog(`Saved raw ASCAP catalog (${event.data.length} items).`);
            } else if (event.type === 'mlc-data') {
              setMlcRaw(event.data);
              addLog(`Saved raw MLC catalog (${event.data.length} items).`);
            } else if (event.type === 'merged-data') {
              const songs = event.data.map((s: Song) => ({ ...s, checked: true }));
              setCatalog(songs);
              addLog(`Successfully merged catalog (${songs.length} total unique works).`);
              
              // Guess publisher name from credentials
              if (ascapUser && !publisherName) {
                setPublisherName(ascapUser.toUpperCase().replace(/\d+/g, '').trim());
              }
              
              setIsRunning(false);
              setTimeout(() => {
                setStep(3);
                toast.success('Extraction complete! Please review your catalog.');
              }, 1500);
            } else if (event.type === 'error') {
              addLog(`❌ Error: ${event.message}`);
              toast.error(event.message);
              setIsRunning(false);
            }
          } catch (e) {
            console.error('Failed to parse stream chunk:', e);
          }
        }
      }
    } catch (error: any) {
      addLog(`❌ Connection lost: ${error.message}`);
      toast.error(`Extraction failed: ${error.message}`);
      setIsRunning(false);
    }
  };

  // Step 2: Relaying MLC MFA Code
  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode) {
      toast.error('Please enter the 2FA code.');
      return;
    }

    setIsSubmittingMfa(true);
    addLog(`Sending 2FA code [${mfaCode}] to MLC extraction process...`);
    
    try {
      const response = await fetch('/api/music-rights/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, code: mfaCode })
      });

      const resData = await response.json();
      if (response.ok) {
        addLog('2FA code relayed successfully. Waiting for MLC to login...');
        setMfaRequired(false);
        setMfaCode('');
      } else {
        addLog(`❌ Failed to verify 2FA: ${resData.error || 'Unknown error'}`);
        toast.error(resData.error || 'Failed to verify 2FA.');
      }
    } catch (err: any) {
      addLog(`❌ 2FA transmission error: ${err.message}`);
      toast.error(err.message);
    } finally {
      setIsSubmittingMfa(false);
    }
  };

  // Step 3: Trigger HFA Submission
  const handleUploadHfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hfaEmail || !hfaPass) {
      toast.error('Please provide HFA email and password.');
      return;
    }
    if (!publisherName) {
      toast.error('Please specify the Owner Publisher Name.');
      return;
    }

    const selectedSongs = catalog.filter(s => s.checked);
    if (selectedSongs.length === 0) {
      toast.error('No songs selected for upload.');
      return;
    }

    setStep(2); // Go back to console view to show progress
    setIsRunning(true);
    setLogs([]);
    addLog(`Starting HFA bulk compilation and upload process for ${selectedSongs.length} songs...`);

    try {
      const response = await fetch('/api/music-rights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          hfaEmail,
          hfaPass,
          publisherName,
          publisherIpi,
          publisherPNumber,
          catalog: selectedSongs
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No readable response stream.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine || !cleanLine.startsWith('data: ')) continue;
          
          try {
            const event = JSON.parse(cleanLine.slice(6));
            if (event.type === 'log') {
              addLog(event.message);
            } else if (event.type === 'success') {
              setSubmissionId(event.submissionId);
              setXlsxBase64(event.xlsxBase64);
              addLog(`🎉 HFA registration successfully submitted! Submission Reference: ${event.submissionId}`);
              setIsRunning(false);
              setTimeout(() => {
                setStep(4);
                toast.success('HFA Submission Approved and Recorded!');
              }, 1500);
            } else if (event.type === 'error') {
              addLog(`❌ Error: ${event.message}`);
              toast.error(event.message);
              setIsRunning(false);
            }
          } catch (e) {
            console.error('Failed to parse upload stream chunk:', e);
          }
        }
      }
    } catch (error: any) {
      addLog(`❌ Upload failure: ${error.message}`);
      toast.error(`HFA upload failed: ${error.message}`);
      setIsRunning(false);
    }
  };

  // Download utilities
  const downloadJson = (data: any, filename: string) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", filename);
    a.click();
  };

  const downloadXlsx = () => {
    if (!xlsxBase64) return;
    const byteCharacters = atob(xlsxBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hfa_bulk_upload_${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
  };

  const toggleSelectAll = (checked: boolean) => {
    setCatalog(prev => prev.map(s => ({ ...s, checked })));
  };

  const toggleSongChecked = (index: number) => {
    setCatalog(prev => prev.map((s, idx) => idx === index ? { ...s, checked: !s.checked } : s));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2 sm:p-4 animate-fade-in-up">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-border/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 shadow-sm shadow-pink-500/5">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Music Rights Portal</h2>
            <p className="text-xs text-muted-foreground">Automated ASCAP/MLC extraction and bulk HFA eSong submission</p>
          </div>
        </div>

        {/* Wizard Steps indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          {[
            { nr: 1, name: 'Credentials' },
            { nr: 2, name: 'Log Terminal' },
            { nr: 3, name: 'Catalog' },
            { nr: 4, name: 'Complete' }
          ].map((sInfo) => {
            const isActive = step === sInfo.nr;
            const isCompleted = step > sInfo.nr;
            return (
              <div key={sInfo.nr} className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold transition-all ${
                  isActive ? 'bg-pink-500 text-white shadow shadow-pink-500/20' : 
                  isCompleted ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 
                  'bg-muted/10 text-muted-foreground border border-border/30'
                }`}>
                  {isCompleted ? <Check className="w-3 h-3" /> : sInfo.nr}
                </span>
                <span className={isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                  {sInfo.name}
                </span>
                {sInfo.nr < 4 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: CREDENTIALS */}
      {step === 1 && (
        <form onSubmit={handleStartExtraction} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border/40 bg-background/25 backdrop-blur-md p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-border/20 pb-3">
                <Shield className="w-4 h-4 text-pink-400" />
                <h3 className="text-sm font-semibold text-foreground">Rights Organizations Authentication</h3>
              </div>

              {/* ASCAP Credentials */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-pink-400 uppercase tracking-wider">ASCAP Member Login</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">Username / Member ID</label>
                    <input
                      type="text"
                      value={ascapUser}
                      onChange={e => setAscapUser(e.target.value)}
                      placeholder="e.g. tap45000"
                      className="w-full px-3 py-2 rounded-lg bg-background/40 border border-border/30 text-xs focus:outline-none focus:border-pink-500/50 text-foreground placeholder:text-muted-foreground/50 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">Password</label>
                    <input
                      type="password"
                      value={ascapPass}
                      onChange={e => setAscapPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-lg bg-background/40 border border-border/30 text-xs focus:outline-none focus:border-pink-500/50 text-foreground placeholder:text-muted-foreground/50 transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              <hr className="border-border/10" />

              {/* MLC Credentials */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-semibold text-pink-400 uppercase tracking-wider">The MLC portal</h4>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">Requires MFA Relay</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">MLC Account Email</label>
                  <input
                    type="email"
                    value={mlcEmail}
                    onChange={e => setMlcEmail(e.target.value)}
                    placeholder="e.g. tap4500@gmail.com"
                    className="w-full px-3 py-2 rounded-lg bg-background/40 border border-border/30 text-xs focus:outline-none focus:border-pink-500/50 text-foreground placeholder:text-muted-foreground/50 transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Lock className="w-3 h-3 text-pink-400" />
                Credentials are processed in-memory and never saved to the server.
              </p>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-semibold text-xs text-white transition-all bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 shadow-md shadow-pink-500/20 active:scale-95"
              >
                Start Scrape & Consolidation
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </div>

          {/* SIDE INFORMATION CARD */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-pink-500/10 to-pink-600/5 p-5 space-y-4">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
                Productized Service Model
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                This utility logs into the client&apos;s ASCAP and MLC portals, scrapes their individual registered catalogs, handles the 2FA login relay, and automatically consolidates them into a unified list ready for bulk submission.
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-1.5" />
                  <span className="text-muted-foreground"><strong className="text-foreground">Cross-PRO Deduplication:</strong> Automatically merges matches and keeps track of unique ASCAP/MLC codes.</span>
                </div>
                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-1.5" />
                  <span className="text-muted-foreground"><strong className="text-foreground">Headed/Stealth Login:</strong> Spawns automation profiles that bypass bot protection.</span>
                </div>
              </div>
            </div>

            {/* PRE-LOAD DATA OPTION */}
            <div className="rounded-2xl border border-border/30 bg-background/15 p-4 text-center">
              <p className="text-[10px] text-muted-foreground mb-2">Want to skip scraping and load Terrence Perry&apos;s previously saved results?</p>
              <button
                type="button"
                onClick={async () => {
                  setStep(2);
                  addLog('Reading cached data files from project workspace...');
                  try {
                    const res = await fetch('/api/music-rights?cached=true');
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);

                    setAscapRaw(data.ascap);
                    setMlcRaw(data.mlc);
                    const songs = data.merged.map((s: Song) => ({ ...s, checked: true }));
                    setCatalog(songs);
                    setPublisherName('TERRENCE A PERRY');

                    addLog('✅ Successfully loaded cached files.');
                    setTimeout(() => {
                      setStep(3);
                      toast.success('Loaded cached catalog review.');
                    }, 1000);
                  } catch (e: any) {
                    addLog(`❌ Failed to read cache: ${e.message}`);
                    toast.error(e.message);
                  }
                }}
                className="w-full border border-border/30 hover:border-pink-500/35 text-muted-foreground hover:text-pink-400 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              >
                Load Local Cached Migration Data
              </button>
            </div>
          </div>
        </form>
      )}

      {/* STEP 2: LOG TERMINAL */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/40 bg-zinc-950 p-5 shadow-2xl relative">
            {/* Header console */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4 text-xs text-zinc-400 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-semibold text-zinc-300">automation@agentbrowser:~</span>
              </div>
              <div className="flex items-center gap-2">
                {isRunning && <Loader2 className="w-3 h-3 text-pink-400 animate-spin" />}
                <span className={isRunning ? 'text-pink-400 animate-pulse' : 'text-zinc-500'}>
                  {isRunning ? 'EXECUTION IN PROGRESS' : 'IDLE'}
                </span>
              </div>
            </div>

            {/* Console logs */}
            <div className="h-96 overflow-y-auto font-mono text-xs text-zinc-300 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {logs.length === 0 ? (
                <p className="text-zinc-600 italic">No logs recorded yet.</p>
              ) : (
                logs.map((log, i) => {
                  let colorClass = 'text-zinc-300';
                  if (log.includes('❌') || log.includes('Error')) colorClass = 'text-red-400 font-semibold';
                  else if (log.includes('⚠️') || log.includes('MFA')) colorClass = 'text-amber-400';
                  else if (log.includes('✅') || log.includes('Successfully') || log.includes('🎉')) colorClass = 'text-emerald-400 font-medium';
                  else if (log.includes('API') || log.includes('Session')) colorClass = 'text-sky-400';

                  return (
                    <p key={i} className={colorClass}>
                      {log}
                    </p>
                  );
                })
              )}
              <div ref={consoleEndRef} />
            </div>

            {/* MFA INTERLUDE FLOATING MODAL/FORM */}
            {mfaRequired && (
              <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm rounded-2xl flex items-center justify-center p-4">
                <form onSubmit={handleVerifyMfa} className="w-full max-w-sm rounded-xl border border-amber-500/30 bg-zinc-900 p-6 space-y-4 shadow-xl">
                  <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-3">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Key className="w-4 h-4 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Verification Code Required</h4>
                      <p className="text-[10px] text-muted-foreground">MLC login verification check</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A multi-factor authorization code has been dispatched. Enter the verification sequence to proceed.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-zinc-400">Security Verification Code</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-semibold focus:outline-none focus:border-amber-500/50 text-foreground text-center tracking-widest uppercase"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingMfa}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 transition-colors"
                  >
                    {isSubmittingMfa ? (
                      <>Relaying Code...<Loader2 className="w-3.5 h-3.5 animate-spin" /></>
                    ) : (
                      <>Verify & Resume Extraction <ArrowRight className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              disabled={isRunning}
              className="px-4 py-2 border border-border/30 hover:border-pink-500/20 rounded-lg text-xs font-semibold text-muted-foreground hover:text-pink-400 transition-colors disabled:opacity-50"
            >
              Back to Credentials
            </button>
            {isRunning && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-pink-400" />
                Browser automation actively running...
              </span>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: CATALOG REVIEW */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Header metadata summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border/30 bg-background/20 p-4">
              <span className="text-[10px] font-semibold text-muted-foreground block uppercase">ASCAP Extracted</span>
              <span className="text-lg font-bold text-foreground">{ascapRaw.length} songs</span>
            </div>
            <div className="rounded-xl border border-border/30 bg-background/20 p-4">
              <span className="text-[10px] font-semibold text-muted-foreground block uppercase">MLC Extracted</span>
              <span className="text-lg font-bold text-foreground">{mlcRaw.length} songs</span>
            </div>
            <div className="rounded-xl border border-border/30 bg-background/20 p-4">
              <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Total Unique Merged</span>
              <span className="text-lg font-bold text-pink-400">{catalog.length} songs</span>
            </div>
            <div className="rounded-xl border border-border/30 bg-background/20 p-4">
              <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Selected for Submission</span>
              <span className="text-lg font-bold text-emerald-400">{catalog.filter(s => s.checked).length} / {catalog.length}</span>
            </div>
          </div>

          <form onSubmit={handleUploadHfa} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Catalog Table */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-border/40 bg-background/25 backdrop-blur-md overflow-hidden shadow-lg">
                <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Catalog Consolidation Table</h3>
                  <div className="flex items-center gap-4 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(true)}
                      className="text-pink-400 hover:text-pink-300 font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-border">|</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(false)}
                      className="text-muted-foreground hover:text-foreground font-semibold"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-border/20 scrollbar-track-transparent">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-background/40 border-b border-border/20 text-muted-foreground font-semibold">
                          <th className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={catalog.length > 0 && catalog.every(s => s.checked)}
                              onChange={(e) => toggleSelectAll(e.target.checked)}
                              className="rounded border-border/30 text-pink-500 focus:ring-pink-500"
                            />
                          </th>
                          <th className="p-3">Song Title</th>
                          <th className="p-3">ASCAP ID</th>
                          <th className="p-3">MLC Code</th>
                          <th className="p-3">ISWC</th>
                          <th className="p-3">ISRC</th>
                          <th className="p-3">Writers</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/10">
                        {catalog.map((song, i) => (
                          <tr
                            key={i}
                            className={`hover:bg-muted/10 transition-colors ${
                              song.checked ? 'text-foreground' : 'text-muted-foreground/60'
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={song.checked}
                                onChange={() => toggleSongChecked(i)}
                                className="rounded border-border/30 text-pink-500 focus:ring-pink-500"
                              />
                            </td>
                            <td className="p-3 font-medium">{song.title}</td>
                            <td className="p-3 font-mono text-[10px] text-muted-foreground">
                              {song.ascapId || <span className="text-zinc-600">—</span>}
                            </td>
                            <td className="p-3 font-mono text-[10px] text-muted-foreground">
                              {song.mlcCode || <span className="text-zinc-600">—</span>}
                            </td>
                            <td className="p-3 font-mono text-[10px] text-muted-foreground">
                              {song.iswc || <span className="text-zinc-600">—</span>}
                            </td>
                            <td className="p-3 font-mono text-[10px] text-muted-foreground">
                              {song.isrc || <span className="text-zinc-600">—</span>}
                            </td>
                            <td className="p-3 text-muted-foreground max-w-xs truncate" title={song.writers || ''}>
                              {song.writers || <span className="text-zinc-600">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
              </div>

              {/* Download JSON actions */}
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => downloadJson(ascapRaw, 'ascap_data.json')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border/30 hover:border-pink-500/20 bg-background/20 rounded-lg text-[10px] font-semibold text-muted-foreground hover:text-pink-400 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  ascap_data.json
                </button>
                <button
                  type="button"
                  onClick={() => downloadJson(mlcRaw, 'mlc_data.json')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border/30 hover:border-pink-500/20 bg-background/20 rounded-lg text-[10px] font-semibold text-muted-foreground hover:text-pink-400 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  mlc_data.json
                </button>
                <button
                  type="button"
                  onClick={() => downloadJson(catalog, 'merged_catalog.json')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border/30 hover:border-pink-500/20 bg-background/20 rounded-lg text-[10px] font-semibold text-muted-foreground hover:text-pink-400 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  merged_catalog.json
                </button>
              </div>
            </div>

            {/* HFA Bulk Upload details */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-border/40 bg-background/25 backdrop-blur-md p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-border/20 pb-3">
                  <Shield className="w-4 h-4 text-pink-400" />
                  <h3 className="text-sm font-semibold text-foreground">HFA Registration Credentials</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">HFA Account Email</label>
                    <input
                      type="email"
                      value={hfaEmail}
                      onChange={e => setHfaEmail(e.target.value)}
                      placeholder="e.g. tap4500@gmail.com"
                      className="w-full px-3 py-2 rounded-lg bg-background/40 border border-border/30 focus:outline-none focus:border-pink-500/50 text-foreground placeholder:text-muted-foreground/50 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">HFA Account Password</label>
                    <input
                      type="password"
                      value={hfaPass}
                      onChange={e => setHfaPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-lg bg-background/40 border border-border/30 focus:outline-none focus:border-pink-500/50 text-foreground placeholder:text-muted-foreground/50 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">HFA P# (Publisher Number)</label>
                    <input
                      type="text"
                      value={publisherPNumber}
                      onChange={e => setPublisherPNumber(e.target.value)}
                      placeholder="e.g. P-012345"
                      className="w-full px-3 py-2 rounded-lg bg-background/40 border border-border/30 focus:outline-none focus:border-pink-500/50 text-foreground placeholder:text-muted-foreground/50 transition-colors"
                    />
                  </div>
                </div>

                <hr className="border-border/10" />

                <div className="flex items-center gap-2 border-b border-border/20 pb-3">
                  <FileText className="w-4 h-4 text-pink-400" />
                  <h3 className="text-sm font-semibold text-foreground">Publisher Split Settings</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">Owner Publisher Name (HFA Record)*</label>
                    <input
                      type="text"
                      value={publisherName}
                      onChange={e => setPublisherName(e.target.value)}
                      placeholder="e.g. TERRENCE A PERRY"
                      className="w-full px-3 py-2 rounded-lg bg-background/40 border border-border/30 focus:outline-none focus:border-pink-500/50 text-foreground placeholder:text-muted-foreground/50 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">Owner Publisher IPI (Optional)</label>
                    <input
                      type="text"
                      value={publisherIpi}
                      onChange={e => setPublisherIpi(e.target.value)}
                      placeholder="e.g. 00812345678"
                      className="w-full px-3 py-2 rounded-lg bg-background/40 border border-border/30 focus:outline-none focus:border-pink-500/50 text-foreground placeholder:text-muted-foreground/50 transition-colors"
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-normal mt-1">
                    Note: Shares split calculation defaults to an equal percentage division among listed songwriters, summing up to 100% per song.
                  </p>
                </div>
              </div>

              {/* Submit to HFA */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl font-semibold text-xs text-white transition-all bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 shadow-md shadow-pink-500/20 active:scale-95"
              >
                Compile eSong Bulk & Submit to HFA
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 4: CONFIRMATION / DOWNLOAD */}
      {step === 4 && (
        <div className="max-w-xl mx-auto rounded-2xl border border-border/40 bg-background/25 backdrop-blur-md p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">Migration Sequence Approved</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The consolidated catalog registration has been compiled into HFA eSong bulk format V2 and uploaded to the HFA portal.
            </p>
          </div>

          {submissionId && (
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl max-w-sm mx-auto font-mono text-xs">
              <span className="text-zinc-500 block uppercase text-[9px] tracking-wider mb-0.5">HFA Submission ID</span>
              <span className="text-foreground font-semibold">{submissionId}</span>
            </div>
          )}

          <div className="border-t border-border/15 pt-6 space-y-3">
            <h4 className="text-xs font-semibold text-pink-400 uppercase tracking-wider">Download Exportable Deliverables</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => downloadJson(catalog, 'merged_catalog.json')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 border border-border/30 hover:border-pink-500/20 bg-background/20 rounded-lg text-xs font-semibold text-muted-foreground hover:text-pink-400 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Merged Catalog JSON
              </button>
              {xlsxBase64 && (
                <button
                  onClick={downloadXlsx}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 border border-border/30 hover:border-pink-500/20 bg-background/20 rounded-lg text-xs font-semibold text-muted-foreground hover:text-pink-400 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  HFA Bulk XLSX
                </button>
              )}
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={() => {
                setStep(1);
                setXlsxBase64(null);
                setSubmissionId(null);
              }}
              className="px-6 py-2 rounded-xl text-xs font-semibold text-white bg-pink-500 hover:bg-pink-600 transition-colors"
            >
              Start Another Migration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
