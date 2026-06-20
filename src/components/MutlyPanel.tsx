'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Box, Play, Loader2, CheckCircle, XCircle,
  RefreshCw, Clock, ChevronDown, ChevronRight, Activity,
} from 'lucide-react';
import { apiPost } from '@/lib/api-client';

interface PipelineInfo {
  pipelineId: string;
  status: string;
}

export default function MutlyPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [projectDir, setProjectDir] = useState('');
  const [pipelineResult, setPipelineResult] = useState<{ loading: boolean; error?: string; data?: PipelineInfo }>({ loading: false });
  const [latestStatus, setLatestStatus] = useState<{ loading: boolean; error?: string; data?: unknown }>({ loading: false });
  const [healthStatus, setHealthStatus] = useState<'unknown' | 'running' | 'stopped'>('unknown');

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/mutly/health');
      setHealthStatus(res.ok ? 'running' : 'stopped');
    } catch {
      setHealthStatus('stopped');
    }
  }, []);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  const handleStartPipeline = async () => {
    setPipelineResult({ loading: true });
    try {
      const res = await apiPost('/api/services', { action: 'mutly-run-pipeline', projectPath: projectDir || undefined });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPipelineResult({ loading: false, data: data.result || data });
    } catch (err: unknown) {
      setPipelineResult({ loading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  const handleRefreshStatus = async () => {
    setLatestStatus({ loading: true });
    try {
      const res = await apiPost('/api/services', { action: 'mutly-status' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setLatestStatus({ loading: false, data: data.status || data });
    } catch (err: unknown) {
      setLatestStatus({ loading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  return (
    <div className="rounded-2xl border border-border/30 bg-background/20">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full p-4 text-left"
      >
        {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        <Box className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-semibold text-foreground">Mutly Pipeline</span>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ml-auto ${
          healthStatus === 'running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${healthStatus === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          {healthStatus === 'running' ? 'Connected' : healthStatus === 'stopped' ? 'Disconnected' : 'Unknown'}
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-4">
          {/* Start Pipeline */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Start Pipeline</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={projectDir}
                onChange={(e) => setProjectDir(e.target.value)}
                placeholder="Project directory (optional)"
                className="flex-1 bg-background/20 border border-border/30 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 font-mono"
              />
              <button
                type="button"
                onClick={handleStartPipeline}
                disabled={pipelineResult.loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-all disabled:opacity-50"
              >
                {pipelineResult.loading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                Run
              </button>
            </div>
            {pipelineResult.error && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                <span className="text-[10px] text-red-400">{pipelineResult.error}</span>
              </div>
            )}
            {pipelineResult.data && (
              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">Pipeline Started</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  ID: {pipelineResult.data.pipelineId}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  Status: {pipelineResult.data.status}
                </div>
              </div>
            )}
          </div>

          {/* Latest Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Latest Pipeline Status</label>
              <button
                type="button"
                onClick={handleRefreshStatus}
                disabled={latestStatus.loading}
                className="p-1 rounded hover:bg-background/20 text-muted-foreground transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${latestStatus.loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {latestStatus.loading ? (
              <div className="flex items-center gap-2 p-3 text-center justify-center">
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                <span className="text-xs text-muted-foreground">Checking status...</span>
              </div>
            ) : latestStatus.error ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                <span className="text-[10px] text-red-400">{latestStatus.error}</span>
              </div>
            ) : latestStatus.data ? (
              <div className="p-3 rounded-xl border border-border/20 bg-background/10">
                <pre className="text-[10px] text-foreground/80 font-mono whitespace-pre-wrap overflow-x-auto max-h-32">
                  {JSON.stringify(latestStatus.data, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No pipeline status yet</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={checkHealth}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/30 bg-background/20 text-[10px] font-medium text-foreground hover:bg-background/30 transition-all"
            >
              <Activity className="w-3 h-3" />
              Check Health
            </button>
            <button
              type="button"
              onClick={handleRefreshStatus}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/30 bg-background/20 text-[10px] font-medium text-foreground hover:bg-background/30 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
