'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Server, RefreshCw, Activity, Clock, CheckCircle, XCircle,
  HelpCircle, Wifi, WifiOff, Search, Download, Key,
} from 'lucide-react';
import VibeServeToolsPanel from './VibeServeToolsPanel';
import MutlyPanel from './MutlyPanel';
import RepoRankPanel from './RepoRankPanel';
import { apiPost, isAuthConfigured } from '@/lib/api-client';

interface ServiceInfo {
  id: string;
  name: string;
  type: string;
  port: number;
  status: 'unknown' | 'running' | 'stopped' | 'error';
  capabilities: string[];
}

interface ServiceStatus {
  id: string;
  running: boolean;
  version?: string;
  error?: string;
}

interface ServiceEvent {
  id: string;
  timestamp: string;
  type: 'info' | 'alert' | 'scan';
  message: string;
}

const SERVICE_META: Record<string, { color: string; bg: string }> = {
  mutly: { color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  vibeserve: { color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  reporank: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
};

function createInitialEvents(services: ServiceInfo[]): ServiceEvent[] {
  const events: ServiceEvent[] = [];
  services.forEach(s => {
    events.push({
      id: `init-${s.id}`,
      timestamp: new Date().toISOString(),
      type: 'info',
      message: `${s.name} dashboard initialized — status: ${s.status}`,
    });
  });
  return events;
}

export default function ServiceDashboard() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const authConfigured = isAuthConfigured();
  const [healthMap, setHealthMap] = useState<Record<string, ServiceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<ServiceEvent[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Use a ref to track previous services without causing re-fetches
  const prevServicesRef = useRef<Record<string, string>>({});

  const addEvent = useCallback((type: ServiceEvent['type'], message: string) => {
    const event: ServiceEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      message,
    };
    setEvents(prev => [event, ...prev].slice(0, 100));
  }, []);

  const fetchAll = useCallback(async (silent = false) => {
    // Abort any in-flight request
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    if (!silent) setRefreshing(true);
    try {
      const res = await fetch('/api/services', { signal: ac.signal });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      const svcs: ServiceInfo[] = data.services || [];
      const health: ServiceStatus[] = data.health || [];

      setServices(svcs);
      const hm: Record<string, ServiceStatus> = {};
      health.forEach(h => { hm[h.id] = h; });
      setHealthMap(hm);
      setError(null);

      // Detect status changes using the ref (avoids stale closure)
      const prevStatuses = prevServicesRef.current;
      svcs.forEach(s => {
        if (prevStatuses[s.id] && prevStatuses[s.id] !== s.status) {
          addEvent('scan', `${s.name} status changed: ${prevStatuses[s.id]} → ${s.status}`);
        }
      });
      // Update ref for next comparison
      const newMap: Record<string, string> = {};
      svcs.forEach(s => { newMap[s.id] = s.status; });
      prevServicesRef.current = newMap;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Failed to fetch service status';
      if (!silent) setError(msg);
      addEvent('alert', `Status check failed: ${msg}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addEvent]);

  useEffect(() => {
    fetchAll();
    return () => { abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchAll(true), 30000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return undefined;
    }
  }, [autoRefresh, fetchAll]);

  const handleRefresh = () => fetchAll();

  const handleCheckService = async (serviceId: string) => {
    addEvent('scan', `Checking ${serviceId}...`);
    try {
      const res = await apiPost('/api/services', { action: 'check', serviceId });
      if (!res.ok) throw new Error(`Check failed: ${res.status}`);
      const status: ServiceStatus = await res.json();
      setHealthMap(prev => ({ ...prev, [serviceId]: status }));
      addEvent(status.running ? 'info' : 'alert',
        `${services.find(s => s.id === serviceId)?.name || serviceId} — ${status.running ? 'running' : 'stopped'}`
      );
    } catch (err: unknown) {
      addEvent('alert', `${serviceId} check error: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  };

  const healthInfo = (id: string): ServiceStatus | undefined => healthMap[id];

  const statusBadge = (svc: ServiceInfo) => {
    const h = healthInfo(svc.id);
    if (loading) return { icon: HelpCircle, label: '...', className: 'text-muted-foreground' };
    if (!h) return { icon: HelpCircle, label: 'Unknown', className: 'text-muted-foreground' };
    if (h.running) return { icon: Wifi, label: 'Running', className: 'text-emerald-400' };
    if (h.error) return { icon: XCircle, label: 'Error', className: 'text-red-400' };
    return { icon: WifiOff, label: 'Stopped', className: 'text-muted-foreground' };
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(events, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-blue-600/5">
          <Server className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Service Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Health & control panel for Mutly, VibeServe, and RepoRank</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold ${authConfigured ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            <Key className="w-2.5 h-2.5" />
            {authConfigured ? 'Auth OK' : 'No API Key'}
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 bg-background/20 text-xs font-medium text-foreground hover:bg-background/30 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh All'}
        </button>
        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 bg-background/20 text-xs text-muted-foreground cursor-pointer hover:bg-background/30 transition-all">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-3 h-3 accent-primary"
          />
          Auto-refresh (30s)
        </label>
        {error && (
          <span className="text-xs text-red-400 ml-2">{error}</span>
        )}
      </div>

      {/* Service Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-5 rounded-2xl border border-border/30 bg-background/20 animate-pulse">
              <div className="h-5 w-24 bg-foreground/10 rounded mb-3" />
              <div className="h-3 w-32 bg-foreground/10 rounded mb-4" />
              <div className="h-3 w-full bg-foreground/10 rounded mb-2" />
              <div className="h-3 w-3/4 bg-foreground/10 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(svc => {
            const meta = SERVICE_META[svc.id] || { color: 'text-foreground', bg: 'bg-background/20' };
            const badge = statusBadge(svc);
            const BadgeIcon = badge.icon;
            const h = healthInfo(svc.id);

            return (
              <div key={svc.id} className={`p-5 rounded-2xl border ${meta.bg} bg-background/10 backdrop-blur-sm transition-all hover:bg-background/20`}>
                {/* Service Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.bg}`}>
                      <Server className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{svc.name}</h3>
                      <span className="text-[10px] text-muted-foreground font-mono">port {svc.port}</span>
                    </div>
                  </div>
                  <BadgeIcon className={`w-4 h-4 ${badge.className} shrink-0`} />
                </div>

                {/* Status */}
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.className} ${
                  h?.running ? 'bg-emerald-500/10' : h?.error ? 'bg-red-500/10' : 'bg-background/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${h?.running ? 'bg-emerald-400 animate-pulse' : h?.error ? 'bg-red-400' : 'bg-muted-foreground'}`} />
                  {badge.label}
                </div>

                {/* Error message */}
                {h?.error && (
                  <p className="mt-2 text-[10px] text-red-400/80 truncate">{h.error}</p>
                )}

                {/* Capabilities */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {svc.capabilities.slice(0, 5).map(cap => (
                    <span key={cap} className="px-1.5 py-0.5 rounded-md bg-background/20 text-[9px] text-muted-foreground font-mono">
                      {cap}
                    </span>
                  ))}
                  {svc.capabilities.length > 5 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-background/20 text-[9px] text-muted-foreground">
                      +{svc.capabilities.length - 5}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCheckService(svc.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/30 bg-background/20 text-[10px] font-medium text-foreground hover:bg-background/30 transition-all"
                  >
                    <Activity className="w-3 h-3" />
                    Check
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mutly Pipeline Panel */}
      <MutlyPanel />

      {/* VibeServe Tools Panel */}
      <VibeServeToolsPanel />

      {/* RepoRank Panel */}
      <RepoRankPanel />

      {/* Event Log */}
      <div className="p-4 rounded-2xl border border-border/30 bg-background/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Service Events</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportLogs}
              className="p-1.5 rounded-lg hover:bg-background/30 text-muted-foreground transition-all"
              title="Export Logs"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setEvents([])}
              className="p-1.5 rounded-lg hover:bg-background/30 text-muted-foreground transition-all"
              title="Clear Events"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No events yet</p>
          ) : (
            events.map(event => {
              const Icon = event.type === 'scan' ? Activity : event.type === 'alert' ? XCircle : CheckCircle;
              return (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl bg-background/10">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${
                    event.type === 'alert' ? 'text-red-400' : 'text-muted-foreground'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{event.message}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground/60" />
                      <span className="text-[10px] text-muted-foreground/60">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border border-border/30 bg-background/20 text-center">
          <p className="text-lg font-bold text-foreground">{services.length}</p>
          <p className="text-xs text-muted-foreground">Services</p>
        </div>
        <div className="p-3 rounded-xl border border-border/30 bg-background/20 text-center">
          <p className="text-lg font-bold text-emerald-400">
            {Object.values(healthMap).filter(h => h.running).length}
          </p>
          <p className="text-xs text-muted-foreground">Running</p>
        </div>
        <div className="p-3 rounded-xl border border-border/30 bg-background/20 text-center">
          <p className="text-lg font-bold text-red-400">
            {Object.values(healthMap).filter(h => !h.running).length}
          </p>
          <p className="text-xs text-muted-foreground">Stopped</p>
        </div>
      </div>
    </div>
  );
}
