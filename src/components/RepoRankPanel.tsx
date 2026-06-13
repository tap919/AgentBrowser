'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, ShieldCheck, Activity,
  Plus, Loader2, CheckCircle, XCircle,
  TrendingUp, Copy, RefreshCw,
} from 'lucide-react';
import { apiPost } from '@/lib/api-client';

interface Brief {
  id: string;
  name: string;
  objective: string;
  status: string;
  createdAt: string;
  targetUsers?: string;
  deliverables?: string[];
}

interface Milestone {
  id: string;
  name: string;
  type: string;
  goal: string;
  status: string;
  targetDate?: string;
}

interface Gate {
  id: string;
  criterion: string;
  type: string;
  status: string;
  evidence?: string;
}

type ReqStatus = 'idle' | 'loading' | 'success' | 'error';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'text-emerald-400 bg-emerald-500/10',
    pending: 'text-amber-400 bg-amber-500/10',
    achieved: 'text-emerald-400 bg-emerald-500/10',
    passed: 'text-emerald-400 bg-emerald-500/10',
    failed: 'text-red-400 bg-red-500/10',
    overridden: 'text-violet-400 bg-violet-500/10',
    'on-scope': 'text-emerald-400 bg-emerald-500/10',
    'at-risk': 'text-amber-400 bg-amber-500/10',
    drifting: 'text-red-400 bg-red-500/10',
    blocked: 'text-red-400 bg-red-500/10',
    approved: 'text-emerald-400 bg-emerald-500/10',
  };
  const c = colors[status] || 'text-muted-foreground bg-background/20';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${c}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'running' || status === 'pending' ? 'animate-pulse' : ''} ${c.split(' ')[0]}`} />
      {status}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <button type="button" onClick={() => navigator.clipboard.writeText(text)}
      className="p-1 rounded hover:bg-background/20 text-muted-foreground transition-all">
      <Copy className="w-3 h-3" />
    </button>
  );
}

export default function RepoRankPanel() {
  const [tab, setTab] = useState<'briefs' | 'milestones' | 'gates' | 'drift'>('briefs');
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [driftResult, setDriftResult] = useState<unknown>(null);
  const [scanResult, setScanResult] = useState<unknown>(null);

  const [briefStatus, setBriefStatus] = useState<ReqStatus>('idle');
  const [milestoneStatus, setMilestoneStatus] = useState<ReqStatus>('idle');
  const [gateStatus, setGateStatus] = useState<ReqStatus>('idle');
  const [driftStatus, setDriftStatus] = useState<ReqStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Create brief form
  const [showCreateBrief, setShowCreateBrief] = useState(false);
  const [briefForm, setBriefForm] = useState({ name: '', objective: '', targetUsers: '', deliverables: '' });

  const apiFetch = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    const res = await apiPost('/api/services', { action, ...extra });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }, []);

  const loadBriefs = useCallback(async () => {
    setBriefStatus('loading'); setError(null);
    try {
      const data = await apiFetch('reporank-list-briefs');
      const list = data.result?.data || data.result || [];
      setBriefs(Array.isArray(list) ? list : []);
      setBriefStatus('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load briefs');
      setBriefStatus('error');
    }
  }, [apiFetch]);

  const loadMilestones = useCallback(async (projectId: string) => {
    setMilestoneStatus('loading');
    try {
      const data = await apiFetch('reporank-list-milestones', { serviceId: projectId });
      const list = data.result?.data || data.result || [];
      setMilestones(Array.isArray(list) ? list : []);
      setMilestoneStatus('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load milestones');
      setMilestoneStatus('error');
    }
  }, [apiFetch]);

  const handleCreateBrief = async () => {
    if (!briefForm.name || !briefForm.objective) return;
    setBriefStatus('loading');
    try {
      await apiFetch('reporank-create-brief', {
        params: {
          name: briefForm.name.trim(),
          objective: briefForm.objective.trim(),
          targetUsers: briefForm.targetUsers.trim() || undefined,
          deliverables: briefForm.deliverables.trim() ? briefForm.deliverables.trim().split('\n').filter(Boolean).map(d => d.trim()) : [],
        },
      });
      setShowCreateBrief(false);
      setBriefForm({ name: '', objective: '', targetUsers: '', deliverables: '' });
      await loadBriefs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create brief');
    }
  };

  const handleSelectBrief = async (brief: Brief) => {
    setSelectedBrief(brief);
    setMilestones([]); setGates([]); setDriftResult(null); setScanResult(null);
    setTab('milestones');
    await loadMilestones(brief.id);
  };

  const handleRunDrift = async (projectId: string) => {
    setDriftStatus('loading');
    try {
      const data = await apiFetch('reporank-run-drift', { serviceId: projectId });
      setDriftResult(data.result || data);
      setDriftStatus('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Drift detection failed');
      setDriftStatus('error');
    }
  };

  useEffect(() => { loadBriefs(); }, [loadBriefs]);

  return (
    <div className="rounded-2xl border border-border/30 bg-background/20">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/20">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <span className="text-sm font-semibold text-foreground">RepoRank</span>
        <div className="flex items-center gap-1 ml-auto">
          <button type="button" onClick={loadBriefs} className="p-1.5 rounded-lg hover:bg-background/20 text-muted-foreground transition-all" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${briefStatus === 'loading' ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3">
        {(['briefs', 'milestones', 'gates', 'drift'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${tab === t ? 'bg-emerald-500/15 text-emerald-400' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'briefs' ? 'Briefs' : t === 'milestones' ? 'Milestones' : t === 'gates' ? 'Gates' : 'Drift'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {error && (
          <div className="flex items-center gap-2 p-3 mb-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}

        {/* ─── Briefs Tab ─── */}
        {tab === 'briefs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{briefs.length} brief{briefs.length !== 1 ? 's' : ''}</span>
              <button type="button" onClick={() => setShowCreateBrief(!showCreateBrief)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-500/20 transition-all">
                <Plus className="w-3 h-3" /> New Brief
              </button>
            </div>

            {/* Create Brief Form */}
            {showCreateBrief && (
              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                <input type="text" value={briefForm.name} onChange={e => setBriefForm(p => ({ ...p, name: e.target.value.slice(0, 200) }))}
                  placeholder="Brief name *" maxLength={200}
                  className="w-full bg-background/20 border border-border/30 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50" />
                <textarea value={briefForm.objective} onChange={e => setBriefForm(p => ({ ...p, objective: e.target.value.slice(0, 2000) }))}
                  placeholder="Objective *" rows={2} maxLength={2000}
                  className="w-full bg-background/20 border border-border/30 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none" />
                <input type="text" value={briefForm.targetUsers} onChange={e => setBriefForm(p => ({ ...p, targetUsers: e.target.value.slice(0, 500) }))}
                  placeholder="Target users (optional)" maxLength={500}
                  className="w-full bg-background/20 border border-border/30 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50" />
                <textarea value={briefForm.deliverables} onChange={e => setBriefForm(p => ({ ...p, deliverables: e.target.value.slice(0, 5000) }))}
                  placeholder="Deliverables (one per line, optional)" rows={2} maxLength={5000}
                  className="w-full bg-background/20 border border-border/30 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none font-mono" />
                <button type="button" onClick={handleCreateBrief} disabled={!briefForm.name || !briefForm.objective}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30 transition-all disabled:opacity-50">
                  {briefStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Create Brief
                </button>
              </div>
            )}

            {/* Brief List */}
            {briefStatus === 'loading' && briefs.length === 0 ? (
              <div className="flex items-center gap-2 p-4 text-center justify-center"><Loader2 className="w-4 h-4 text-muted-foreground animate-spin" /><span className="text-xs text-muted-foreground">Loading briefs...</span></div>
            ) : briefs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No briefs yet. Create one to get started.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {briefs.map(b => (
                  <button key={b.id} type="button" onClick={() => handleSelectBrief(b)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${selectedBrief?.id === b.id ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-border/20 bg-background/10 hover:bg-background/20'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">{b.name}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{b.objective}</p>
                    {b.deliverables && b.deliverables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {b.deliverables.slice(0, 3).map((d, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-background/20 text-[9px] text-muted-foreground font-mono">{d}</span>
                        ))}
                        {b.deliverables.length > 3 && <span className="text-[9px] text-muted-foreground">+{b.deliverables.length - 3}</span>}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Milestones Tab ─── */}
        {tab === 'milestones' && (
          <div className="space-y-3">
            {!selectedBrief ? (
              <p className="text-xs text-muted-foreground text-center py-4">Select a brief first.</p>
            ) : milestoneStatus === 'loading' ? (
              <div className="flex items-center gap-2 py-4 text-center justify-center"><Loader2 className="w-4 h-4 text-muted-foreground animate-spin" /><span className="text-xs text-muted-foreground">Loading milestones...</span></div>
            ) : milestones.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No milestones for this brief yet.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-foreground">{selectedBrief.name}</span>
                </div>
                {milestones.map(m => (
                  <div key={m.id} className="p-3 rounded-xl border border-border/20 bg-background/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">{m.name}</span>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{m.goal}</p>
                    {m.targetDate && <p className="text-[9px] text-muted-foreground/60 mt-1">Target: {new Date(m.targetDate).toLocaleDateString()}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Gates Tab ─── */}
        {tab === 'gates' && (
          <div className="space-y-3">
            {!selectedBrief ? (
              <p className="text-xs text-muted-foreground text-center py-4">Select a brief and milestone first.</p>
            ) : (
              <div className="space-y-2">
                {milestones.filter(m => m.status === 'achieved').length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Complete a milestone to evaluate gates.</p>
                ) : (
                  milestones.filter(m => m.status === 'achieved').map(m => (
                    <div key={m.id} className="p-3 rounded-xl border border-border/20 bg-background/10">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-semibold text-foreground">{m.name}</span>
                      </div>
                      {gates.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">No gates defined for this milestone.</p>
                      ) : gates.filter(g => g.id.startsWith(m.id)).map(g => (
                        <div key={g.id} className="flex items-center justify-between p-2 rounded-lg bg-background/10 mb-1">
                          <span className="text-[10px] text-foreground">{g.criterion}</span>
                          <StatusBadge status={g.status} />
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Drift Tab ─── */}
        {tab === 'drift' && (
          <div className="space-y-3">
            {!selectedBrief ? (
              <p className="text-xs text-muted-foreground text-center py-4">Select a brief first.</p>
            ) : (
              <>
                <button type="button" onClick={() => handleRunDrift(selectedBrief.id)} disabled={driftStatus === 'loading'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-all disabled:opacity-50">
                  {driftStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                  Run Drift Detection
                </button>

                {driftResult && (
                  <div className="p-3 rounded-xl border border-border/20 bg-background/10">
                    <pre className="text-[10px] text-foreground/80 font-mono whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
                      {JSON.stringify(driftResult, null, 2)}
                    </pre>
                    <div className="flex items-center gap-2 mt-2">
                      <CopyButton text={JSON.stringify(driftResult, null, 2)} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
