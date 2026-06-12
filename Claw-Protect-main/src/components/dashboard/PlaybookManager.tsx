/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PlaybookManager — SOAR playbook builder and case management dashboard.
 *
 * Inspired by:
 *   • Tracecat (low-code security workflow automation, case management)
 *   • Cisco AI Defense (enterprise guardrails and compliance enforcement)
 */

import React, { useState, useMemo } from 'react';
import {
  Workflow,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Shield,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Inbox,
  Target,
  Lock,
  Zap,
  Users,
  Gauge,
  ListChecks,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'motion/react';
import {
  playbookEngine,
  complianceEngine,
} from '@/lib/security';
import type {
  Playbook,
  PlaybookExecution,
  SecurityCase,
  ComplianceFramework,
  PolicyRule,
} from '@/lib/security';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const casePriorityVariant = {
  critical: 'destructive' as const,
  high: 'destructive' as const,
  medium: 'secondary' as const,
  low: 'outline' as const,
};

const caseStatusColor: Record<string, string> = {
  open: 'text-amber-500',
  investigating: 'text-blue-500',
  remediated: 'text-emerald-500',
  closed: 'text-muted-foreground',
};

const stepStatusIcon: Record<string, React.ElementType> = {
  completed: CheckCircle2,
  failed: XCircle,
  running: RefreshCw,
  awaiting_approval: Clock,
  pending: Clock,
  skipped: XCircle,
};

const triggerColors: Record<string, string> = {
  prompt_injection: 'bg-red-500/10 text-red-500 border-red-500/30',
  behavioral_drift: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  data_exfiltration: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  shadow_agent: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  supply_chain_vuln: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  compliance_violation: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
  manual: 'bg-muted text-muted-foreground border-border/30',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PlaybookManager() {
  const [selectedPbId, setSelectedPbId] = useState<string | null>(null);

  const playbooks = playbookEngine.getPlaybooks();
  const executions = playbookEngine.getExecutions();
  const cases = playbookEngine.getCases();
  const pbStats = playbookEngine.getStatistics();

  // Compliance data
  const policies = complianceEngine.getPolicies();
  const complianceSummaries = useMemo(
    () => {
      const frameworks = complianceEngine.getSupportedFrameworks();
      return frameworks.map((fw) => ({ framework: fw, ...complianceEngine.getFrameworkSummary(fw) }));
    },
    [],
  );

  const handleRunPlaybook = (pbId: string) => {
    playbookEngine.executePlaybook(pbId, 'security-operator');
    // Force re-render by deselecting/reselecting
    setSelectedPbId(null);
    setTimeout(() => setSelectedPbId(pbId), 50);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20">
            <Workflow className="w-6 h-6 text-violet-500" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Playbooks &amp; Compliance</h1>
            <p className="text-muted-foreground mt-1">
              Automated response workflows, case management &amp; enterprise guardrails
            </p>
          </div>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">
          {pbStats.activePlaybooks} active playbooks · {pbStats.openCases} open cases
        </Badge>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard icon={Workflow} label="Playbooks" value={pbStats.totalPlaybooks} />
        <KpiCard icon={Play} label="Executions" value={pbStats.totalExecutions} />
        <KpiCard icon={CheckCircle2} label="Succeeded" value={pbStats.successfulExecutions} color="text-emerald-500 bg-emerald-500/10" />
        <KpiCard icon={Inbox} label="Open Cases" value={pbStats.openCases} color="text-amber-500 bg-amber-500/10" />
        <KpiCard icon={AlertTriangle} label="Critical Cases" value={pbStats.criticalCases} color="text-red-500 bg-red-500/10" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="playbooks" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="playbooks">
            <Workflow className="w-4 h-4 mr-2" />
            Playbooks
          </TabsTrigger>
          <TabsTrigger value="cases">
            <FileText className="w-4 h-4 mr-2" />
            Cases
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Shield className="w-4 h-4 mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="policies">
            <Lock className="w-4 h-4 mr-2" />
            Policies
          </TabsTrigger>
        </TabsList>

        {/* ─── Playbooks ─── */}
        <TabsContent value="playbooks" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Playbook list */}
            <Card className="lg:col-span-2 bg-card/50 border-border/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ListChecks className="w-4 h-4" />
                  Security Playbooks
                </CardTitle>
                <CardDescription>Automated response workflows triggered by security events</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {playbooks.map((pb) => (
                      <motion.div
                        key={pb.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          selectedPbId === pb.id
                            ? 'bg-primary/5 border-primary/30'
                            : 'bg-muted/20 border-border/20 hover:border-primary/10'
                        }`}
                        onClick={() => setSelectedPbId(pb.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{pb.name}</span>
                            <Badge
                              variant={pb.status === 'active' ? 'default' : 'secondary'}
                              className="text-[9px] capitalize"
                            >
                              {pb.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); handleRunPlaybook(pb.id); }}
                            >
                              <Play className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{pb.description}</p>
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${triggerColors[pb.trigger] ?? triggerColors.manual}`}>
                            <Zap className="w-3 h-3" />
                            {pb.trigger.replace(/_/g, ' ')}
                          </span>
                          <span className="text-muted-foreground">
                            {pb.steps.length} steps
                          </span>
                          <span className="text-muted-foreground">
                            {pb.executionCount} runs
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Playbook detail */}
            <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-wider">
                  {selectedPbId ? 'Playbook Steps' : 'Select a Playbook'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-2">
                  {selectedPbId ? (
                    <PlaybookDetail playbook={playbookEngine.getPlaybook(selectedPbId)!} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/50">
                      <Workflow className="w-10 h-10 mb-3" />
                      <p className="text-xs">Click a playbook to view its steps</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Cases ─── */}
        <TabsContent value="cases" className="mt-4">
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Security Cases
              </CardTitle>
              <CardDescription>Incident tracking and investigation management</CardDescription>
            </CardHeader>
            <CardContent>
              {cases.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Case</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Events</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map((c) => (
                        <tr key={c.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-3">
                            <p className="text-xs font-semibold">{c.title}</p>
                            <p className="text-[10px] text-muted-foreground">{c.id}</p>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={casePriorityVariant[c.priority]} className="text-[9px] capitalize">{c.priority}</Badge>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-xs capitalize font-semibold ${caseStatusColor[c.status]}`}>{c.status}</span>
                          </td>
                          <td className="py-3 px-3 text-xs text-muted-foreground font-mono">
                            {c.createdAt.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-xs font-mono">{c.events.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
                  <Inbox className="w-10 h-10 mb-3" />
                  <p className="text-xs">No cases yet. Run a playbook to generate one.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Compliance ─── */}
        <TabsContent value="compliance" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {complianceSummaries
              .filter((s) => s.total > 0)
              .map((s) => (
                <Card key={s.framework} className="bg-card/50 border-border/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-mono">{s.framework.replace(/_/g, ' ')}</CardTitle>
                      <Badge
                        variant={s.score >= 80 ? 'default' : s.score >= 50 ? 'secondary' : 'destructive'}
                        className="text-[9px]"
                      >
                        {s.score}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={s.score} className="h-2" />
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-emerald-500">{s.compliant}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Compliant</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-amber-500">{s.partial}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Partial</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-red-500">{s.nonCompliant}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Non-Compliant</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {complianceEngine.getControls(s.framework as ComplianceFramework).map((ctrl) => (
                        <div key={ctrl.id} className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground font-mono">{ctrl.controlRef}</span>
                          <span className="truncate mx-2 flex-1 text-muted-foreground">{ctrl.title}</span>
                          <ComplianceStatusDot status={ctrl.status} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* ─── Policies ─── */}
        <TabsContent value="policies" className="mt-4">
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Enterprise Policy Rules
              </CardTitle>
              <CardDescription>Organization-wide guardrails for AI agent behavior</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {policies.map((policy) => (
                    <PolicyCard key={policy.id} policy={policy} />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, color = 'text-primary bg-primary/10' }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
      <CardContent className="p-5">
        <div className={`inline-flex p-2 rounded-lg mb-3 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-3xl font-bold mb-1">{value}</div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      </CardContent>
    </Card>
  );
}

function PlaybookDetail({ playbook }: { playbook: Playbook }) {
  return (
    <div className="space-y-3">
      {playbook.steps
        .sort((a, b) => a.order - b.order)
        .map((step, idx) => {
          const IconComp = step.requiresApproval ? Users : Target;
          return (
            <div
              key={step.id}
              className="flex gap-3 p-3 rounded-lg bg-muted/20 border border-border/20"
            >
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  {step.order}
                </div>
                {idx < playbook.steps.length - 1 && (
                  <div className="w-px flex-1 bg-border/40 mt-1" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{step.name}</span>
                  <Badge variant="outline" className="text-[9px] font-mono capitalize">
                    {step.actionType.replace(/_/g, ' ')}
                  </Badge>
                </div>
                {step.requiresApproval && (
                  <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Requires human approval
                  </p>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}

function ComplianceStatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    compliant: 'bg-emerald-500',
    partial: 'bg-amber-500',
    non_compliant: 'bg-red-500',
    not_applicable: 'bg-muted-foreground/30',
  };
  return <div className={`w-2 h-2 rounded-full shrink-0 ${colors[status] ?? 'bg-muted'}`} />;
}

function PolicyCard({ policy }: { key?: string; policy: PolicyRule }) {
  const actionColors: Record<string, string> = {
    block: 'text-red-500',
    flag: 'text-amber-500',
    log: 'text-blue-500',
    notify: 'text-violet-500',
  };

  return (
    <div className="p-4 rounded-xl bg-muted/20 border border-border/20 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${policy.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
          <span className="text-sm font-semibold">{policy.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={policy.severity === 'critical' ? 'destructive' : policy.severity === 'high' ? 'destructive' : 'secondary'} className="text-[9px]">
            {policy.severity}
          </Badge>
          <span className={`text-[10px] font-bold uppercase ${actionColors[policy.action] ?? 'text-muted-foreground'}`}>
            {policy.action}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{policy.description}</p>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
        <span>Condition: {policy.condition}</span>
        <span>Triggered {policy.triggerCount}×</span>
      </div>
    </div>
  );
}
