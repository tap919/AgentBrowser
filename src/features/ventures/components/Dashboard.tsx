'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FolderGit2, Github, Music, Wrench, Target,
  CheckCircle2, Clock, RefreshCw, Brain,
  AlertTriangle, ListChecks, Cpu, DollarSign,
  TrendingUp, Zap, ShieldCheck, BarChart3,
} from 'lucide-react';
import type { ProjectAnalysis } from '@/lib/project-automation';

interface DashboardData {
  watchedProjects: Array<{ name: string; exists: boolean; hasGit: boolean; hasPackageJson: boolean }>;
  analyses: ProjectAnalysis[];
  localProjects: Array<{ name: string; hasGit: boolean; hasPackageJson: boolean; updatedAt: string }>;
  tools: Array<{ name: string; type: string }>;
}

interface BusinessData {
  skills: { total: number; byCategory: Record<string, number> };
  finance: {
    accounts: Array<{ id: string; name: string; type: string; balance: number; currency?: string }>;
    budgets: Array<{ id: string; name: string; allocated: number; spent: number }>;
    revenueStreams: Array<{ id: string; name: string; monthlyAvg: number; trend: string }>;
    health: { monthlyRevenue: number; monthlyBurn: number; netProfit: number; runwayMonths: number; budgetHealth: string };
  };
  transactions: Array<{ id: string; date: string; description: string; amount: number; type: string }>;
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'projects' | 'skills'>('overview');

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [autoRes, bizRes] = await Promise.all([
        fetch('http://localhost:3000/api/automation/projects').catch(() => null),
        fetch('http://localhost:3000/api/business?action=status').catch(() => null),
      ]);
      if (autoRes?.ok) setData(await autoRes.json());
      if (bizRes?.ok) setBusiness(await bizRes.json());
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <Centered><RefreshCw className="w-6 h-6 text-primary animate-spin" /></Centered>;
  if (error) return <Centered><p className="text-sm text-red-400">{error}<br /><button onClick={loadData} className="mt-2 px-3 py-1 rounded text-xs border border-border/30 hover:bg-muted/10">Retry</button></p></Centered>;
  if (!data) return null;

  const health = business?.finance.health;
  const totalBudget = business?.finance.budgets.reduce((s, b) => s + b.allocated, 0) || 0;
  const totalSpent = business?.finance.budgets.reduce((s, b) => s + b.spent, 0) || 0;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-lg border border-border/30 bg-background/20 p-0.5 w-fit">
        {([
          { id: 'overview' as const, label: 'Overview', icon: Brain },
          { id: 'finance' as const, label: 'Finance', icon: DollarSign },
          { id: 'projects' as const, label: 'Projects', icon: FolderGit2 },
          { id: 'skills' as const, label: 'Skills', icon: Zap },
        ]).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              activeTab === t.id ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-muted-foreground/60 hover:text-muted-foreground'
            }`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Financial health cards */}
          {health && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Monthly Revenue" value={`$${health.monthlyRevenue}`} icon={TrendingUp} color="text-emerald-400" />
              <MetricCard label="Monthly Burn" value={`$${health.monthlyBurn}`} icon={BarChart3} color="text-blue-400" />
              <MetricCard label="Net Profit" value={`$${health.netProfit}`} icon={DollarSign} color={health.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              <MetricCard label="Runway" value={`${health.runwayMonths}m`} icon={Clock} color={health.runwayMonths > 6 ? 'text-emerald-400' : 'text-amber-400'} />
            </div>
          )}

          {/* Budget utilization */}
          {business?.finance.budgets && (
            <Section title="Budget Utilization" icon={<DollarSign className="w-4 h-4 text-emerald-400" />}>
              <div className="space-y-2">
                {business.finance.budgets.map(b => {
                  const pct = b.allocated > 0 ? Math.round((b.spent / b.allocated) * 100) : 0;
                  return (
                    <div key={b.id} className="space-y-1">
                      <div className="flex justify-between text-[11px]"><span className="text-foreground/80">{b.name}</span><span className="text-muted-foreground">${b.spent} / ${b.allocated}</span></div>
                      <div className="w-full h-1.5 rounded-full bg-muted/20 overflow-hidden">
                        <div className={`h-full rounded-full ${pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-muted-foreground">Budget health: <span className={`font-semibold ${health?.budgetHealth === 'good' ? 'text-emerald-400' : health?.budgetHealth === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>{health?.budgetHealth}</span></p>
              </div>
            </Section>
          )}

          {/* Revenue streams */}
          {business?.finance.revenueStreams && (
            <Section title="Revenue Streams" icon={<TrendingUp className="w-4 h-4 text-blue-400" />}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {business.finance.revenueStreams.map(r => (
                  <div key={r.id} className="p-3 rounded-xl border border-border/30 bg-background/30">
                    <p className="text-xs font-semibold text-foreground">{r.name}</p>
                    <p className="text-lg font-bold text-foreground mt-1">${r.monthlyAvg}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {r.trend === 'up' ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : r.trend === 'down' ? <TrendingUp className="w-3 h-3 text-red-400 rotate-180" /> : <Zap className="w-3 h-3 text-amber-400" />}
                      {r.trend} trend
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Recent transactions */}
          {business?.transactions && business.transactions.length > 0 && (
            <Section title="Recent Transactions" icon={<Clock className="w-4 h-4 text-cyan-400" />}>
              <div className="space-y-1">
                {business.transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-muted/5 text-xs">
                    <div><p className="text-foreground/80">{t.description}</p><p className="text-[9px] text-muted-foreground">{new Date(t.date).toLocaleDateString()}</p></div>
                    <span className={`font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>{t.type === 'income' ? '+' : '-'}${Math.abs(t.amount)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Quick overview of project health */}
          <Section title="Project Health" icon={<ShieldCheck className="w-4 h-4 text-blue-400" />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {data.analyses.slice(0, 8).map(a => (
                <div key={a.projectName} className="p-2.5 rounded-lg border border-border/30 bg-background/30">
                  <p className="text-[11px] font-semibold text-foreground truncate">{a.projectName}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${a.reporank.quality === 'good' ? 'bg-emerald-400' : a.reporank.quality === 'needs-work' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    <span className="text-[9px] text-muted-foreground">{a.reporank.score}/100</span>
                  </div>
                  {a.reporank.issues.length > 0 && <p className="text-[8px] text-muted-foreground mt-0.5">{a.reporank.issues.length} issues</p>}
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="space-y-5">
          {/* Accounts */}
          <Section title="Accounts" icon={<DollarSign className="w-4 h-4 text-emerald-400" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {business?.finance.accounts.map(a => (
                <div key={a.id} className="p-4 rounded-xl border border-border/30 bg-background/30">
                  <p className="text-xs text-muted-foreground">{a.name}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">${a.balance.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{a.type} · {a.currency}</p>
                </div>
              ))}
            </div>
          </Section>
          {/* Budgets */}
          <Section title="Budgets" icon={<Target className="w-4 h-4 text-amber-400" />}>
            <div className="space-y-3">
              {business?.finance.budgets.map(b => {
                const pct = b.allocated > 0 ? Math.round((b.spent / b.allocated) * 100) : 0;
                return (
                  <div key={b.id} className="p-3 rounded-xl border border-border/30 bg-background/30">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-semibold text-foreground">{b.name}</span>
                      <span className={`text-xs font-semibold ${pct > 85 ? 'text-red-400' : pct > 60 ? 'text-amber-400' : 'text-emerald-400'}`}>${b.spent} / ${b.allocated}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted/20 overflow-hidden">
                      <div className={`h-full rounded-full ${pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="space-y-4">
          {data.analyses.map(a => (
            <div key={a.projectName} className="p-4 rounded-xl border border-border/30 bg-background/30">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-foreground">{a.projectName}</h4>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                  a.reporank.quality === 'good' ? 'bg-emerald-500/10 text-emerald-400' :
                  a.reporank.quality === 'needs-work' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                }`}>{a.reporank.score}/100</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground mb-2">
                <span>{a.reporank.details.codeFiles} files</span>
                <span>{a.reporank.details.linesOfCode.toLocaleString()} lines</span>
                <span>{a.reporank.details.depsCount} deps</span>
              </div>
              {a.reporank.issues.length > 0 && (
                <div className="space-y-0.5">
                  {a.reporank.issues.slice(0, 3).map((iss, i) => (
                    <p key={i} className="text-[10px] text-amber-400/80 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" />{iss}</p>
                  ))}
                </div>
              )}
              {a.tasks.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/20 space-y-1">
                  {a.tasks.map((t, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px]">
                      <CheckCircle2 className={`w-3 h-3 mt-0.5 flex-shrink-0 ${t.status === 'completed' ? 'text-emerald-400' : 'text-muted-foreground/30'}`} />
                      <span className={t.status === 'completed' ? 'line-through text-muted-foreground/50' : 'text-foreground/80'}>{t.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="space-y-4">
          <Section title="Business Skills" icon={<Zap className="w-4 h-4 text-purple-400" />}>
            <p className="text-xs text-muted-foreground mb-3">{business?.skills.total || 0} skills across {Object.entries(business?.skills.byCategory || {}).map(([k, v]) => `${k} (${v})`).join(', ')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['content-creation', 'seo-analysis', 'social-posting', 'market-research', 'music-promotion', 'revenue-analysis'].map(skill => (
                <div key={skill} className="p-2.5 rounded-lg border border-border/30 bg-background/30 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground capitalize">{skill.replace(/-/g, ' ')}</p>
                    <p className="text-[9px] text-muted-foreground">Ready via Big Homie</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Desktop Tools" icon={<Wrench className="w-4 h-4 text-orange-400" />}>
            <div className="flex flex-wrap gap-2">
              {data.tools.map(t => (
                <span key={t.name} className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400">{t.name}</span>
              ))}
              {data.tools.length === 0 && <p className="text-xs text-muted-foreground">No desktop tools registered. Run a project scan.</p>}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">{icon}<h3 className="text-sm font-bold text-foreground">{title}</h3></div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="p-3 rounded-xl border border-border/30 bg-background/30">
      <div className="flex items-center gap-1.5 mb-1"><Icon className={`w-3.5 h-3.5 ${color}`} /><span className="text-[10px] text-muted-foreground">{label}</span></div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[400px] flex items-center justify-center">{children}</div>;
}
