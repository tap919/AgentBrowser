'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Bot, Brain, Clock3, ExternalLink, Loader2, Play, Plus,
  RefreshCw, ShieldCheck, Sparkles, Trash2, Workflow, Zap,
} from 'lucide-react';

import {
  describeCron,
  type AutonomousModeSettings,
  type ExecutionLog,
  type ScheduledAgent,
  type SchedulerStats,
} from '@/lib/autonomous-agents';

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface AgentsResponse {
  agents: ScheduledAgent[];
  logs: ExecutionLog[];
  stats: SchedulerStats;
  settings: AutonomousModeSettings;
}

interface Memory {
  id?: string;
  memory?: string;
  text?: string;
  created_at?: string;
}

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  updatedAt?: string;
}

type PanelTab = 'agents' | 'memory' | 'n8n' | 'crew';

const BIG_HOMIE = process.env.NEXT_PUBLIC_BIG_HOMIE_URL ?? 'http://localhost:8888';
const N8N_URL   = process.env.NEXT_PUBLIC_N8N_URL       ?? 'http://localhost:5678';

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function AutonomousAgentsPanel() {
  const [activeTab, setActiveTab] = useState<PanelTab>('agents');
  const [data,      setData]      = useState<AgentsResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [actingId,  setActingId]  = useState<string | null>(null);

  /* ── Agent scheduling (existing) ─────────────────────────────────────────── */

  const loadAgents = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch('/api/autonomous-agents', signal ? { signal } : {});
      if (!res.ok) throw new Error('Failed to load agents');
      const payload = await res.json() as AgentsResponse;
      if (!signal?.aborted) setData(payload);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      toast.error('Failed to load autonomous agents');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void loadAgents(ac.signal);
    return () => ac.abort();
  }, [loadAgents]);

  const latestLogByAgent = useMemo(() => {
    const map = new Map<string, ExecutionLog>();
    for (const log of data?.logs ?? []) if (!map.has(log.agentId)) map.set(log.agentId, log);
    return map;
  }, [data?.logs]);

  const updateAgent = async (id: string, updates: { enabled?: boolean; cronExpression?: string }) => {
    setActingId(id);
    try {
      const res = await fetch('/api/autonomous-agents', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok || payload.error) throw new Error(payload.error ?? 'Update failed');
      await loadAgents();
    } catch (err) {
      toast.error('Failed to update agent', { description: err instanceof Error ? err.message : '' });
    } finally { setActingId(null); }
  };

  const updateSettings = async (settings: Partial<AutonomousModeSettings>) => {
    setActingId('settings');
    try {
      const res = await fetch('/api/autonomous-agents', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok || payload.error) throw new Error(payload.error ?? 'Settings update failed');
      await loadAgents();
    } catch (err) {
      toast.error('Failed to update settings');
    } finally { setActingId(null); }
  };

  const autoConfigure = async () => {
    setActingId('autoconfigure');
    try {
      const res = await fetch('/api/autonomous-agents', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoConfigure: true }),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok || payload.error) throw new Error(payload.error ?? 'Auto-configure failed');
      toast.success('Autonomous mode configured');
      await loadAgents();
    } catch (err) {
      toast.error('Auto-configure failed');
    } finally { setActingId(null); }
  };

  const runNow = async (id: string) => {
    setActingId(id);
    try {
      const res = await fetch('/api/autonomous-agents/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok || payload.error) throw new Error(payload.error ?? 'Run failed');
      toast.success('Agent executed', { description: id });
      await loadAgents();
    } catch (err) {
      toast.error('Run failed');
    } finally { setActingId(null); }
  };

  /* ── Tab bar ─────────────────────────────────────────────────────────────── */
  const TABS: { id: PanelTab; label: string; icon: typeof Bot }[] = [
    { id: 'agents', label: 'Agents',  icon: Bot      },
    { id: 'memory', label: 'Memory',  icon: Brain    },
    { id: 'n8n',    label: 'n8n',     icon: Workflow },
    { id: 'crew',   label: 'Crew',    icon: Sparkles },
  ];

  return (
    <div className="w-full rounded-2xl border border-border/30 bg-background/20 overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 sm:px-6 py-4 border-b border-border/30">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-foreground">Autonomous Ops</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void autoConfigure()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/15 transition-colors"
            >
              <Zap className="w-3 h-3" /> Auto Configure
            </button>
            <button
              onClick={() => void loadAgents()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border/30 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400'
                  : 'border border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-3 h-3" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="px-4 sm:px-6 py-4">
        {activeTab === 'agents' && <AgentsTab data={data} setData={setData} loading={loading} actingId={actingId} latestLogByAgent={latestLogByAgent} runNow={runNow} updateAgent={updateAgent} updateSettings={updateSettings} />}
        {activeTab === 'memory' && <MemoryTab />}
        {activeTab === 'n8n'    && <N8nTab />}
        {activeTab === 'crew'   && <CrewTab />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   AGENTS TAB (unchanged logic, extracted to sub-component)
   ═══════════════════════════════════════════════════════════════════════════════ */
function AgentsTab({
  data, setData, loading, actingId, latestLogByAgent, runNow, updateAgent, updateSettings,
}: {
  data: AgentsResponse | null;
  setData: (data: AgentsResponse | null) => void;
  loading: boolean;
  actingId: string | null;
  latestLogByAgent: Map<string, ExecutionLog>;
  runNow: (id: string) => Promise<void>;
  updateAgent: (id: string, updates: { enabled?: boolean; cronExpression?: string }) => Promise<void>;
  updateSettings: (s: Partial<AutonomousModeSettings>) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
            <button
              onClick={() => void updateSettings({ enabled: !data.settings.enabled })}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${data.settings.enabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-border/30 bg-background/30 text-muted-foreground hover:text-foreground'}`}
            >
              <div className="font-semibold uppercase tracking-wide">Mode</div>
              <div className="mt-1 text-xs">{data.settings.enabled ? 'Enabled' : 'Disabled'}</div>
            </button>
            <div className="rounded-xl border border-border/30 bg-background/30 px-3 py-3 text-muted-foreground">
              <div className="font-semibold uppercase tracking-wide">Policy</div>
              <div className="mt-1 text-xs text-foreground/90">{data.settings.policyLevel}</div>
            </div>
            <div className="rounded-xl border border-border/30 bg-background/30 px-3 py-3 text-muted-foreground">
              <div className="font-semibold uppercase tracking-wide">Resume</div>
              <div className="mt-1 text-xs text-foreground/90">{data.settings.resumeOnRestart ? 'On restart' : 'Manual'}</div>
            </div>
            <div className="rounded-xl border border-border/30 bg-background/30 px-3 py-3 text-muted-foreground">
              <div className="font-semibold uppercase tracking-wide">Runs</div>
              <div className="mt-1 text-xs text-foreground/90">{data.stats.totalExecutions}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            <span className="px-2 py-1 rounded-full border border-border/30 bg-background/30">Agents: {data.stats.totalAgents}</span>
            <span className="px-2 py-1 rounded-full border border-border/30 bg-background/30">Enabled: {data.stats.enabledAgents}</span>
            <span className="px-2 py-1 rounded-full border border-border/30 bg-background/30">Successes: {data.stats.totalSuccesses}</span>
            <span className="px-2 py-1 rounded-full border border-border/30 bg-background/30">Failures: {data.stats.totalFailures}</span>
          </div>
        </>
      )}

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-border/20 bg-background/20 px-4 py-3 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading autonomous agents...
        </div>
      )}

      {!loading && data?.agents.map(agent => {
        const latestLog = latestLogByAgent.get(agent.id);
        const isActing  = actingId === agent.id;
        return (
          <div key={agent.id} className="rounded-xl border border-border/30 bg-background/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase border ${agent.enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-muted/20 text-muted-foreground border-border/30'}`}>{agent.enabled ? 'enabled' : 'disabled'}</span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase border ${agent.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : agent.status === 'running' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>{agent.status}</span>
                  {data?.settings.enabled && data.settings.autoUpgradeSafe && agent.id === 'market-intelligence' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase border bg-violet-500/10 text-violet-400 border-violet-500/20">
                      <ShieldCheck className="w-2.5 h-2.5" /> Safe Upgrades
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{agent.description}</p>
              </div>
              <button onClick={() => void runNow(agent.id)} disabled={isActing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-[11px] font-medium text-primary disabled:opacity-50 hover:bg-primary/15 transition-colors"
              >
                {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Run Now
              </button>
            </div>

            <div className="flex flex-wrap gap-1">
              {agent.skills.map(skill => (
                <span key={`${agent.id}-${skill}`} className="px-1.5 py-0.5 rounded text-[8px] font-medium border border-border/40 bg-muted/30 text-muted-foreground">{skill}</span>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Cron</span>
                <input
                  value={agent.cronExpression}
                  onChange={(e) => {
                    if (!data) return;
                    const val = e.target.value;
                    setData({
                      ...data,
                      agents: data.agents.map(a => a.id === agent.id ? { ...a, cronExpression: val } : a)
                    });
                  }}
                  onBlur={(e) => void updateAgent(agent.id, { cronExpression: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border/30 bg-background/20 text-xs text-foreground outline-none focus:border-primary/30"
                />
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80">
                  <Clock3 className="w-3 h-3" /> {describeCron(agent.cronExpression)}
                </span>
              </label>
              <div className="space-y-1 text-xs">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Last Run</div>
                <div className="rounded-lg border border-border/30 bg-background/20 px-3 py-2 text-foreground/90">{agent.lastRun ? new Date(agent.lastRun).toLocaleString() : 'Never'}</div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Next Run</div>
                <div className="rounded-lg border border-border/30 bg-background/20 px-3 py-2 text-foreground/90">{agent.nextRun ? new Date(agent.nextRun).toLocaleString() : 'Unavailable'}</div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] text-muted-foreground">
                {latestLog ? `Latest ${latestLog.status} run in ${Math.max(1, Math.round(latestLog.duration / 1000))}s` : 'No executions logged yet.'}
              </div>
              <button onClick={() => void updateAgent(agent.id, { enabled: !agent.enabled })} disabled={isActing}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${agent.enabled ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'} disabled:opacity-50`}
              >
                {agent.enabled ? 'Pause Schedule' : 'Enable Schedule'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MEMORY TAB — Mem0 persistent memory viewer
   ═══════════════════════════════════════════════════════════════════════════════ */
function MemoryTab() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [status,   setStatus]   = useState<'ok' | 'unavailable' | 'idle'>('idle');
  const [search,   setSearch]   = useState('');

  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BIG_HOMIE}/memory/all`);
      const data = await res.json() as { status: string; memories: Memory[]; message?: string };
      setStatus(data.status as 'ok' | 'unavailable');
      setMemories(data.memories ?? []);
    } catch {
      setStatus('unavailable');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadMemories(); }, [loadMemories]);

  const filtered = search
    ? memories.filter(m => (m.memory ?? m.text ?? '').toLowerCase().includes(search.toLowerCase()))
    : memories;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/30 focus-within:border-purple-500/40 transition-all">
          <Brain className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
          />
        </div>
        <button onClick={() => void loadMemories()} className="p-2 rounded-xl border border-border/30 text-muted-foreground hover:text-foreground hover:border-purple-500/30 transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {status === 'unavailable' && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-400">
          <span className="font-semibold">Mem0 not active.</span> Install with:{' '}
          <code className="font-mono bg-amber-500/10 px-1 rounded">pip install mem0ai</code>
          {' '}then restart Big Homie. Once installed, every conversation is stored and recalled here.
        </div>
      )}

      {status === 'ok' && memories.length === 0 && !loading && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No memories yet — start chatting with Big Homie to build the memory store.
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading memories...
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((m, i) => (
          <div key={m.id ?? i} className="rounded-xl border border-border/30 bg-background/30 px-4 py-3 text-xs text-foreground/80 leading-relaxed flex items-start gap-2">
            <Brain className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
            <span className="flex-1">{m.memory ?? m.text ?? JSON.stringify(m)}</span>
            {m.created_at && <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">{new Date(m.created_at).toLocaleDateString()}</span>}
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center">{filtered.length} memor{filtered.length === 1 ? 'y' : 'ies'}{search ? ' matching search' : ' stored'}</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   N8N TAB — n8n workflow engine integration
   ═══════════════════════════════════════════════════════════════════════════════ */
function N8nTab() {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [online,    setOnline]    = useState<boolean | null>(null);

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${N8N_URL}/api/v1/workflows`, { headers: { 'Accept': 'application/json' } });
      const data = await res.json() as { data?: N8nWorkflow[] };
      setWorkflows(data.data ?? []);
      setOnline(true);
    } catch {
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadWorkflows(); }, [loadWorkflows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${online === true ? 'bg-emerald-400' : online === false ? 'bg-red-400' : 'bg-amber-400'} animate-pulse`} />
          <span className="text-xs text-muted-foreground">
            {online === true ? `n8n online — ${workflows.length} workflow${workflows.length !== 1 ? 's' : ''}` : online === false ? 'n8n offline' : 'Checking...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a href={N8N_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border/30 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Open n8n
          </a>
          <button onClick={() => void loadWorkflows()} className="p-1.5 rounded-lg border border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {online === false && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-400 space-y-2">
          <p><span className="font-semibold">n8n not running.</span> Start it with the launcher or manually:</p>
          <code className="block font-mono bg-amber-500/10 px-3 py-2 rounded-lg">npm install -g n8n &amp;&amp; n8n start</code>
          <p className="text-[10px] text-muted-foreground">n8n runs on <strong>port 5678</strong> and connects to Big Homie via webhooks.</p>
        </div>
      )}

      {online === true && workflows.length === 0 && (
        <div className="text-center py-8 space-y-3">
          <Workflow className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No workflows yet.</p>
          <a href={`${N8N_URL}/workflow/new`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-xs font-medium text-purple-400 hover:bg-purple-500/15 transition-colors"
          >
            <Plus className="w-3 h-3" /> Create first workflow
          </a>
        </div>
      )}

      <div className="space-y-2">
        {workflows.map(wf => (
          <div key={wf.id} className="rounded-xl border border-border/30 bg-background/30 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Workflow className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span className="text-xs font-medium text-foreground truncate">{wf.name}</span>
              <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase border ${wf.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-muted/20 text-muted-foreground border-border/30'}`}>
                {wf.active ? 'active' : 'inactive'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch(`${BIG_HOMIE}/n8n/trigger`, { 
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ workflow_id: wf.id })
                    });
                    if (res.ok) toast.success(`Workflow "${wf.name}" triggered!`);
                    else toast.error('Failed to trigger workflow');
                  } catch {
                    toast.error('Big Homie unreachable');
                  }
                }}
                className="p-1.5 rounded-lg border border-purple-500/20 text-purple-400 hover:bg-purple-500/10 transition-all"
                title="Trigger Workflow"
              >
                <Play className="w-3 h-3" />
              </button>
              <a href={`${N8N_URL}/workflow/${wf.id}`} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/10 transition-all"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CREW TAB — CrewAI multi-agent pipeline launcher
   ═══════════════════════════════════════════════════════════════════════════════ */
const CREW_AGENTS = ['Researcher', 'Architect', 'Coder', 'Tester', 'Auditor', 'Deployer', 'Reporter'];
const CREW_SKILLS = [
  { id: '',          label: 'Full Pipeline' },
  { id: 'research',  label: 'Research only' },
  { id: 'architect', label: 'Architecture only' },
  { id: 'code',      label: 'Code only' },
  { id: 'audit',     label: 'Audit only' },
];

function CrewTab() {
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [skill,       setSkill]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState<{ status: string; result?: string; agents_used?: string[]; message?: string } | null>(null);

  const launchCrew = async () => {
    if (!projectName.trim() || !projectDesc.trim()) {
      toast.error('Please enter a project name and description');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${BIG_HOMIE}/crew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: projectName, project_desc: projectDesc, skill }),
      });
      const data = await res.json() as typeof result;
      setResult(data);
      if (data?.status === 'success') toast.success('CrewAI pipeline complete!');
    } catch {
      toast.error('Failed to reach Big Homie — is it running?');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Agent roster */}
      <div className="flex flex-wrap gap-1.5">
        {CREW_AGENTS.map(a => (
          <span key={a} className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-purple-500/10 border border-purple-500/20 text-purple-400">{a}</span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Launch a 7-agent CrewAI crew powered by <span className="text-purple-400 font-semibold">OpenRouter</span>.
        Each agent handles a specialised phase: research → architecture → code → test → security → deploy → report.
      </p>

      {/* Config form */}
      <div className="space-y-3">
        <input
          type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
          placeholder="Project name (e.g. Inventory Management SaaS)"
          className="w-full px-3 py-2.5 rounded-xl border border-border/40 bg-background/30 text-sm outline-none focus:border-purple-500/40 transition-all placeholder:text-muted-foreground/50"
        />
        <textarea
          value={projectDesc} onChange={e => setProjectDesc(e.target.value)} rows={3}
          placeholder="Describe what you want to build in detail..."
          className="w-full px-3 py-2.5 rounded-xl border border-border/40 bg-background/30 text-sm outline-none focus:border-purple-500/40 transition-all placeholder:text-muted-foreground/50 resize-none"
        />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Mode:</span>
          {CREW_SKILLS.map(s => (
            <button key={s.id} onClick={() => setSkill(s.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${skill === s.id ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400' : 'border border-border/30 text-muted-foreground hover:text-foreground'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => void launchCrew()} disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, oklch(0.55 0.22 280), oklch(0.5 0.18 320))' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Crew running...' : 'Launch Crew'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-4 space-y-2 ${result.status === 'success' ? 'border-emerald-500/20 bg-emerald-500/5' : result.status === 'unavailable' ? 'border-amber-500/20 bg-amber-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Sparkles className={`w-3.5 h-3.5 ${result.status === 'success' ? 'text-emerald-400' : result.status === 'unavailable' ? 'text-amber-400' : 'text-red-400'}`} />
            <span className={result.status === 'success' ? 'text-emerald-400' : result.status === 'unavailable' ? 'text-amber-400' : 'text-red-400'}>
              {result.status === 'success' ? 'Crew complete' : result.status === 'unavailable' ? 'CrewAI not installed' : 'Error'}
            </span>
            {result.agents_used && (
              <span className="ml-auto text-muted-foreground font-normal">{result.agents_used.join(' → ')}</span>
            )}
          </div>
          {result.message && <p className="text-xs text-amber-400">{result.message}</p>}
          {result.result && (
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed font-sans max-h-64 overflow-y-auto">{result.result}</pre>
          )}
          {result.status === 'unavailable' && (
            <code className="block font-mono text-[10px] bg-amber-500/10 px-3 py-2 rounded-lg text-amber-400">
              pip install crewai langchain-openai
            </code>
          )}
        </div>
      )}
    </div>
  );
}
