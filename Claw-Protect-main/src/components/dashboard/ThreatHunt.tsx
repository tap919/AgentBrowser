/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ThreatHunt — Digital Forensics & Incident Response (DFIR) panel.
 *
 * Inspired by the DFIR agent in the Overlay-Cyber-Security repo (src/cai/agents/dfir.py)
 * which specialises in:
 *   • System / network forensics
 *   • Memory forensics
 *   • Timeline reconstruction
 *   • Threat hunting / IOC tracking
 *   • Evidence preservation and incident response workflows
 */

import React, { useState } from 'react';
import {
  Search,
  AlertTriangle,
  Clock,
  FileSearch,
  Activity,
  Target,
  Shield,
  CheckCircle2,
  Circle,
  ArrowRight,
  HardDrive,
  Cpu,
  Network,
  Lock,
  Zap,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'motion/react';

// ─── Types ────────────────────────────────────────────────────────────────────

type IocType = 'IP' | 'Domain' | 'Hash' | 'Path' | 'Signature';
type IocStatus = 'confirmed' | 'suspected' | 'cleared';
type Severity = 'critical' | 'high' | 'medium' | 'low';
type IRPhase = 'Preparation' | 'Identification' | 'Containment' | 'Eradication' | 'Recovery' | 'Lessons Learned';

interface ForensicFinding {
  id: number;
  source: string;
  message: string;
  severity: Severity;
  timestamp: string;
  evidence: string;
}

interface IOC {
  id: number;
  indicator: string;
  type: IocType;
  status: IocStatus;
  firstSeen: string;
  hits: number;
  description: string;
}

interface IRStep {
  phase: IRPhase;
  status: 'complete' | 'active' | 'pending';
  description: string;
  actions: string[];
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const forensicFindings: ForensicFinding[] = [
  {
    id: 1,
    source: 'Memory Forensics',
    message: 'Anomalous heap allocation pattern detected in openclaw-main process',
    severity: 'critical',
    timestamp: '2026-04-12 00:21:04',
    evidence: 'PID 4823 — 2.1 GB RSS, 14 suspicious RWX pages',
  },
  {
    id: 2,
    source: 'Disk Forensics',
    message: 'Unexpected write to /tmp/.ocx-persist detected',
    severity: 'high',
    timestamp: '2026-04-12 00:19:47',
    evidence: 'File hash: a3f9e1… — matches known persistence template',
  },
  {
    id: 3,
    source: 'Network Forensics',
    message: 'DNS beaconing to untrusted TLD detected (*.xyz every 60s)',
    severity: 'high',
    timestamp: '2026-04-12 00:18:33',
    evidence: '47 queries in 60 minutes — periodic interval matches C2 pattern',
  },
  {
    id: 4,
    source: 'Log Analysis',
    message: 'Authentication token reuse across two agent sessions',
    severity: 'medium',
    timestamp: '2026-04-12 00:15:11',
    evidence: 'Token issued at 23:58, reused 18 minutes later by different agent',
  },
  {
    id: 5,
    source: 'Memory Forensics',
    message: 'Injected shellcode fragment identified in hermes-worker memory map',
    severity: 'critical',
    timestamp: '2026-04-11 23:58:02',
    evidence: 'NOP sled + XOR decoding stub at 0x7ffe3010 — YARA match RULE_INJECT_001',
  },
];

const iocList: IOC[] = [
  { id: 1, indicator: '185.244.31.0/24', type: 'IP', status: 'confirmed', firstSeen: '04/11 23:40', hits: 28, description: 'Known C2 infrastructure (Shodan tagged)' },
  { id: 2, indicator: 'sync-update[.]xyz', type: 'Domain', status: 'confirmed', firstSeen: '04/12 00:18', hits: 47, description: 'DNS beaconing target' },
  { id: 3, indicator: 'a3f9e1c72d...', type: 'Hash', status: 'suspected', firstSeen: '04/12 00:19', hits: 1, description: '/tmp/.ocx-persist file hash' },
  { id: 4, indicator: '/tmp/.ocx-persist', type: 'Path', status: 'suspected', firstSeen: '04/12 00:19', hits: 1, description: 'Persistence artifact path' },
  { id: 5, indicator: 'RULE_INJECT_001', type: 'Signature', status: 'confirmed', firstSeen: '04/11 23:58', hits: 3, description: 'YARA rule — shellcode injection stub' },
  { id: 6, indicator: '142.93.0.0/16', type: 'IP', status: 'cleared', firstSeen: '04/11 20:00', hits: 4, description: 'DigitalOcean CDN — cleared after attribution' },
];

const irWorkflow: IRStep[] = [
  {
    phase: 'Preparation',
    status: 'complete',
    description: 'Security tools configured, runbooks ready, agents baselocked.',
    actions: ['Baseline snapshots taken', 'Alert thresholds configured', 'On-call rotation active'],
  },
  {
    phase: 'Identification',
    status: 'active',
    description: 'Anomalies detected across memory, disk, and network layers.',
    actions: ['Forensic findings logged', 'IOCs extracted and catalogued', 'Severity triage in progress'],
  },
  {
    phase: 'Containment',
    status: 'pending',
    description: 'Isolate affected agents and block confirmed IOCs.',
    actions: ['Quarantine openclaw-main', 'Block 185.244.31.0/24 at firewall', 'Revoke compromised tokens'],
  },
  {
    phase: 'Eradication',
    status: 'pending',
    description: 'Remove artifacts and harden attack vectors.',
    actions: ['Delete /tmp/.ocx-persist', 'Patch injection vector', 'Rotate all agent credentials'],
  },
  {
    phase: 'Recovery',
    status: 'pending',
    description: 'Restore agents from known-good snapshots.',
    actions: ['Verify clean snapshots', 'Incremental restart with monitoring', 'Re-baseline agents'],
  },
  {
    phase: 'Lessons Learned',
    status: 'pending',
    description: 'Post-incident report and rule updates.',
    actions: ['Write PIR', 'Update detection signatures', 'Schedule red team exercise'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const severityVariant = {
  critical: 'destructive' as const,
  high: 'destructive' as const,
  medium: 'secondary' as const,
  low: 'outline' as const,
};

const severityDot = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

const iocStatusVariant = {
  confirmed: 'destructive' as const,
  suspected: 'secondary' as const,
  cleared: 'outline' as const,
};

const phaseIcon = {
  complete: CheckCircle2,
  active: Zap,
  pending: Circle,
};

const phaseColor = {
  complete: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  active: 'text-primary bg-primary/10 border-primary/30',
  pending: 'text-muted-foreground bg-muted/20 border-border/20',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ThreatHunt() {
  const [activeIocFilter, setActiveIocFilter] = useState<IocStatus | 'all'>('all');
  const [huntRunning, setHuntRunning] = useState(false);

  const filteredIocs = activeIocFilter === 'all'
    ? iocList
    : iocList.filter(i => i.status === activeIocFilter);

  const confirmedCount = iocList.filter(i => i.status === 'confirmed').length;
  const suspectedCount = iocList.filter(i => i.status === 'suspected').length;
  const criticalCount = forensicFindings.filter(f => f.severity === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
            <FileSearch className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              Threat Hunt
            </h1>
            <p className="text-muted-foreground mt-1">
              Digital forensics, incident response, and proactive threat hunting
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Active Incident
          </Badge>
          <Button
            variant={huntRunning ? 'secondary' : 'default'}
            className="gap-2"
            onClick={() => setHuntRunning(h => !h)}
          >
            {huntRunning ? (
              <><Activity className="w-4 h-4 animate-pulse" />Hunting…</>
            ) : (
              <><Search className="w-4 h-4" />Start Hunt</>
            )}
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={AlertTriangle} label="Critical Findings" value={criticalCount} color="text-red-500 bg-red-500/10" />
        <KpiCard icon={Target} label="IOCs Confirmed" value={confirmedCount} color="text-orange-500 bg-orange-500/10" />
        <KpiCard icon={Eye} label="IOCs Suspected" value={suspectedCount} color="text-yellow-500 bg-yellow-500/10" />
        <KpiCard icon={Shield} label="IR Phase" value="Identification" color="text-primary bg-primary/10" textValue />
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="forensics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="forensics">
            <HardDrive className="w-4 h-4 mr-2" />
            Forensic Findings
          </TabsTrigger>
          <TabsTrigger value="iocs">
            <Target className="w-4 h-4 mr-2" />
            IOC Tracker
          </TabsTrigger>
          <TabsTrigger value="ir">
            <ArrowRight className="w-4 h-4 mr-2" />
            IR Workflow
          </TabsTrigger>
        </TabsList>

        {/* Forensic Findings */}
        <TabsContent value="forensics" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card/50 border-border/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Forensic Timeline
                </CardTitle>
                <CardDescription>Evidence gathered from memory, disk, and network layers</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[460px] pr-4">
                  <div className="space-y-3">
                    {forensicFindings.map((finding, idx) => (
                      <motion.div
                        key={finding.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        className="flex gap-4 p-4 rounded-lg bg-muted/20 border border-border/20 hover:border-primary/20 transition-all"
                      >
                        <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${severityDot[finding.severity]}`} />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                              {finding.source}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant={severityVariant[finding.severity]} className="text-[9px]">
                                {finding.severity}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {finding.timestamp}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm font-medium">{finding.message}</p>
                          <p className="text-[11px] text-muted-foreground font-mono bg-muted/30 px-2 py-1 rounded">
                            {finding.evidence}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right panel: forensic source breakdown */}
            <div className="space-y-4">
              <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm uppercase tracking-wider">Source Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Memory Forensics', icon: Cpu, count: 2, pct: 40 },
                    { label: 'Network Forensics', icon: Network, count: 1, pct: 20 },
                    { label: 'Disk Forensics', icon: HardDrive, count: 1, pct: 20 },
                    { label: 'Log Analysis', icon: Activity, count: 1, pct: 20 },
                  ].map(s => (
                    <div key={s.label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <s.icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs">{s.label}</span>
                        </div>
                        <span className="text-xs font-mono">{s.count}</span>
                      </div>
                      <Progress value={s.pct} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm uppercase tracking-wider">Hunt Coverage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Process Memory', pct: 72, done: true },
                    { label: 'File System', pct: 55, done: false },
                    { label: 'Network Traffic', pct: 88, done: true },
                    { label: 'Auth Logs', pct: 100, done: true },
                    { label: 'Registry / Config', pct: 30, done: false },
                  ].map(c => (
                    <div key={c.label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">{c.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono">{c.pct}%</span>
                          {c.done
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            : <Clock className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                      </div>
                      <Progress value={c.pct} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* IOC Tracker */}
        <TabsContent value="iocs" className="mt-4">
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Indicators of Compromise
                  </CardTitle>
                  <CardDescription>Extracted artifacts under investigation</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {(['all', 'confirmed', 'suspected', 'cleared'] as const).map(f => (
                    <Button
                      key={f}
                      size="sm"
                      variant={activeIocFilter === f ? 'default' : 'outline'}
                      onClick={() => setActiveIocFilter(f)}
                      className="text-xs capitalize"
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Indicator</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hits</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">First Seen</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIocs.map(ioc => (
                      <tr key={ioc.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 font-mono text-xs">{ioc.indicator}</td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-[9px] font-mono">{ioc.type}</Badge>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={iocStatusVariant[ioc.status]} className="text-[9px] capitalize">{ioc.status}</Badge>
                        </td>
                        <td className="text-right py-3 px-3 font-mono text-xs">{ioc.hits}</td>
                        <td className="py-3 px-3 text-xs text-muted-foreground font-mono">{ioc.firstSeen}</td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">{ioc.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IR Workflow */}
        <TabsContent value="ir" className="mt-4">
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Incident Response Phases
              </CardTitle>
              <CardDescription>
                NIST SP 800-61 inspired workflow — track progress from detection to recovery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {irWorkflow.map((step, idx) => {
                  const PhaseIcon = phaseIcon[step.status];
                  return (
                    <motion.div
                      key={step.phase}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.07 }}
                      className={`p-4 rounded-xl border ${phaseColor[step.status]}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg shrink-0 ${phaseColor[step.status]}`}>
                          <PhaseIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-sm">{step.phase}</h3>
                            <Badge
                              variant={
                                step.status === 'complete' ? 'default'
                                  : step.status === 'active' ? 'secondary'
                                  : 'outline'
                              }
                              className="text-[9px] capitalize"
                            >
                              {step.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{step.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {step.actions.map(action => (
                              <span
                                key={action}
                                className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-background/50 border border-border/40"
                              >
                                {action}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, color, textValue = false }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  textValue?: boolean;
}) {
  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
      <CardContent className="p-5">
        <div className={`inline-flex p-2 rounded-lg mb-3 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className={`font-bold mb-1 ${textValue ? 'text-lg' : 'text-3xl'}`}>{value}</div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      </CardContent>
    </Card>
  );
}
