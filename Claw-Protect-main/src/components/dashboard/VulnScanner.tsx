/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * VulnScanner — Vulnerability scanner dashboard.
 *
 * Inspired by:
 *   • Snyk (vulnerability scanning with fix recommendations, SBOM)
 *   • agentic-radar (dependency graph visualization, OWASP mapping)
 *   • msoedov/agentic-security (prompt fuzzing / adversarial testing)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShieldAlert,
  Bug,
  Package,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Download,
  Zap,
  Network,
  Target,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'motion/react';
import {
  agentDependencyGraph,
  promptFuzzingEngine,
} from '@/lib/security';
import type {
  DependencyNode,
  AttackPath,
  SBOMEntry,
  FuzzCampaignSummary,
  FuzzResult,
  FuzzCategory,
  MutationStrategy,
} from '@/lib/security';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sevBadge = {
  critical: 'destructive' as const,
  high: 'destructive' as const,
  medium: 'secondary' as const,
  low: 'outline' as const,
};

const sevDot: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-400',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function VulnScanner() {
  const [scanning, setScanning] = useState(false);
  const [fuzzResult, setFuzzResult] = useState<FuzzCampaignSummary | null>(null);
  const [fuzzResults, setFuzzResults] = useState<FuzzResult[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stats = agentDependencyGraph.getStatistics();
  const vulnNodes = agentDependencyGraph.getVulnerableNodes();
  const attackPaths = agentDependencyGraph.detectAttackPaths();
  const sbom = agentDependencyGraph.generateSBOM();
  const allNodes = agentDependencyGraph.getNodes();

  // Clean up pending timeout on unmount to avoid updating state on unmounted component
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleRunFuzz = () => {
    setScanning(true);
    timerRef.current = setTimeout(() => {
      const campaign = promptFuzzingEngine.createCampaign(
        'Full Fuzzing Sweep',
        'openclaw-main',
      );
      setFuzzResult(campaign.summary ?? null);
      setFuzzResults(campaign.results);
      setScanning(false);
      timerRef.current = null;
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20">
            <ShieldAlert className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Vulnerability Scanner</h1>
            <p className="text-muted-foreground mt-1">
              Dependency graph, SBOM, attack paths &amp; adversarial fuzzing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export SBOM
          </Button>
          <Button
            size="sm"
            className="gap-2"
            disabled={scanning}
            onClick={handleRunFuzz}
          >
            {scanning ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />Fuzzing…</>
            ) : (
              <><Zap className="w-4 h-4" />Run Fuzz Campaign</>
            )}
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard icon={Package} label="Components" value={stats.totalNodes} />
        <KpiCard icon={Bug} label="Vulnerable" value={stats.vulnerableComponents} color="text-orange-500 bg-orange-500/10" />
        <KpiCard icon={AlertTriangle} label="Critical CVEs" value={stats.criticalVulnerabilities} color="text-red-500 bg-red-500/10" />
        <KpiCard icon={Network} label="Unencrypted Flows" value={stats.unencryptedFlows} color="text-yellow-500 bg-yellow-500/10" />
        <KpiCard icon={Target} label="Attack Paths" value={stats.attackPaths} color="text-red-500 bg-red-500/10" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="graph" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="graph">
            <GitBranch className="w-4 h-4 mr-2" />
            Dependency Graph
          </TabsTrigger>
          <TabsTrigger value="attacks">
            <Target className="w-4 h-4 mr-2" />
            Attack Paths
          </TabsTrigger>
          <TabsTrigger value="sbom">
            <Package className="w-4 h-4 mr-2" />
            SBOM
          </TabsTrigger>
          <TabsTrigger value="fuzz">
            <Zap className="w-4 h-4 mr-2" />
            Fuzz Results
          </TabsTrigger>
        </TabsList>

        {/* ─── Dependency Graph ─── */}
        <TabsContent value="graph" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card/50 border-border/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Agent → Tool / MCP / Model / API Graph
                </CardTitle>
                <CardDescription>All components and their connections</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px] pr-4">
                  <div className="space-y-3">
                    {allNodes
                      .filter((n) => n.type === 'agent')
                      .map((agent) => {
                        const deps = agentDependencyGraph.getDependencies(agent.id);
                        return (
                          <motion.div
                            key={agent.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-muted/20 border border-border/20 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="font-mono text-sm font-semibold">{agent.name}</span>
                                <Badge variant="outline" className="text-[9px]">{agent.type}</Badge>
                                {Boolean(agent.metadata?.framework) && (
                                  <Badge variant="secondary" className="text-[9px]">
                                    {agent.metadata.framework as React.ReactNode}
                                  </Badge>
                                )}
                              </div>
                              <Badge
                                variant={agent.riskScore > 30 ? 'destructive' : 'outline'}
                                className="text-[9px]"
                              >
                                Risk {agent.riskScore}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {deps.map((dep) => (
                                <DependencyChip key={dep.id} node={dep} />
                              ))}
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right panel: vulnerable components */}
            <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Vulnerable Components
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px] pr-2">
                  <div className="space-y-3">
                    {vulnNodes.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">No vulnerabilities detected ✓</p>
                    ) : (
                      vulnNodes.map((node) => (
                        <div key={node.id} className="p-3 rounded-lg bg-muted/20 border border-border/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-semibold">{node.name}</span>
                            <Badge variant="outline" className="text-[9px]">{node.version}</Badge>
                          </div>
                          {node.vulnerabilities.map((v) => (
                            <div key={v.id} className="flex gap-2 items-start text-[11px]">
                              <div className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 ${sevDot[v.severity]}`} />
                              <div className="flex-1">
                                <p className="font-medium">{v.title}</p>
                                {v.fixAvailable && v.fixRecommendation && (
                                  <p className="text-emerald-500 mt-0.5">
                                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                    Fix: {v.fixRecommendation}
                                  </p>
                                )}
                                {!v.fixAvailable && (
                                  <p className="text-muted-foreground">
                                    <XCircle className="w-3 h-3 inline mr-1" />
                                    No automated fix available
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Attack Paths ─── */}
        <TabsContent value="attacks" className="mt-4">
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Detected Attack Paths
              </CardTitle>
              <CardDescription>
                Chains of dependencies where risk propagates from vulnerable component to agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {attackPaths.map((path, idx) => (
                    <motion.div
                      key={path.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="flex gap-4 p-4 rounded-lg bg-muted/20 border border-border/20 hover:border-primary/20 transition-all"
                    >
                      <div className={`w-1.5 self-stretch rounded-full shrink-0 ${sevDot[path.severity]}`} />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-sm font-semibold">{path.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={sevBadge[path.severity]} className="text-[9px]">
                              {path.severity}
                            </Badge>
                            {path.owaspMapping.map((ref) => (
                              <Badge key={ref} variant="outline" className="text-[9px] font-mono">
                                OWASP {ref}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{path.description}</p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                          {path.nodeChain.map((nId, i) => {
                            const n = agentDependencyGraph.getNode(nId);
                            return (
                              <React.Fragment key={nId}>
                                {i > 0 && <ArrowRight className="w-3 h-3" />}
                                <span className="px-1.5 py-0.5 rounded bg-background/50 border border-border/30">
                                  {n?.name ?? nId}
                                </span>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {attackPaths.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-12">No attack paths detected ✓</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── SBOM ─── */}
        <TabsContent value="sbom" className="mt-4">
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Software Bill of Materials
                  </CardTitle>
                  <CardDescription>Full inventory of tools, models, APIs &amp; services</CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-[9px]">
                  {sbom.length} components
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Component</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Version</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ecosystem</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trusted</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vulns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sbom.map((entry) => (
                      <tr key={entry.name} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 font-mono text-xs">{entry.name}</td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">{entry.version}</td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-[9px]">{entry.type}</Badge>
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">{entry.ecosystem}</td>
                        <td className="text-center py-3 px-3">
                          {entry.trusted
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                            : <XCircle className="w-3.5 h-3.5 text-red-500 mx-auto" />}
                        </td>
                        <td className="text-right py-3 px-3">
                          {entry.vulnerabilityCount > 0 ? (
                            <Badge variant={entry.criticalCount > 0 ? 'destructive' : 'secondary'} className="text-[9px]">
                              {entry.vulnerabilityCount}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Fuzz Results ─── */}
        <TabsContent value="fuzz" className="mt-4">
          {fuzzResult ? (
            <FuzzResultPanel summary={fuzzResult} results={fuzzResults} />
          ) : (
            <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
              <CardContent className="py-20 flex flex-col items-center justify-center text-center">
                <Zap className="w-10 h-10 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  No fuzz campaign results yet. Run a campaign to test guardrail resilience.
                </p>
                <Button onClick={handleRunFuzz} disabled={scanning} className="gap-2">
                  {scanning
                    ? <><RefreshCw className="w-4 h-4 animate-spin" />Fuzzing…</>
                    : <><Zap className="w-4 h-4" />Start Fuzz Campaign</>
                  }
                </Button>
              </CardContent>
            </Card>
          )}
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

const nodeTypeColor: Record<string, string> = {
  tool: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  mcp_server: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  model: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  api: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  database: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
  service: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
};

function DependencyChip({ node }: { key?: string; node: DependencyNode }) {
  const color = nodeTypeColor[node.type] ?? 'bg-muted text-muted-foreground';
  const hasVuln = node.vulnerabilities.length > 0;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border ${color}`}>
      {hasVuln && <Bug className="w-3 h-3 text-red-500" />}
      {!node.trusted && <AlertTriangle className="w-3 h-3 text-amber-500" />}
      <span>{node.name}</span>
      {node.version && <span className="opacity-60">@{node.version}</span>}
    </span>
  );
}

function FuzzResultPanel({ summary, results }: { summary: FuzzCampaignSummary; results: FuzzResult[] }) {
  // Compute per-strategy pass rates from actual campaign results
  const strategyPassRates = useMemo(() => {
    const rates = new Map<MutationStrategy, number>();
    const stats = new Map<MutationStrategy, { passed: number; total: number }>();
    for (const r of results) {
      const stat = stats.get(r.strategy) ?? { passed: 0, total: 0 };
      stat.total++;
      if (r.passed) stat.passed++;
      stats.set(r.strategy, stat);
    }
    for (const [strat, stat] of stats) {
      rates.set(strat, stat.total > 0 ? (stat.passed / stat.total) * 100 : 0);
    }
    return rates;
  }, [results]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 bg-card/50 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Fuzz Campaign Results
          </CardTitle>
          <CardDescription>
            {summary.totalTests} adversarial payloads tested across {promptFuzzingEngine.getStrategies().length} mutation strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pass / Fail Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-500 font-semibold">Detected: {summary.passed}</span>
              <span className="text-red-500 font-semibold">Bypassed: {summary.failed}</span>
            </div>
            <Progress value={summary.passRate * 100} className="h-3" />
            <p className="text-[10px] text-muted-foreground text-center font-mono">
              {Math.round(summary.passRate * 100)}% detection rate
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-muted/20 border border-border/20 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Avg Confidence</p>
              <p className="text-xl font-bold">{summary.avgDetectionConfidence}%</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border/20 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Avg Response</p>
              <p className="text-xl font-bold">{summary.avgResponseTime}ms</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border/20 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Weakest Area</p>
              <p className="text-xs font-mono font-bold mt-1">{summary.weakestCategory.replace('_', ' ')}</p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommendations</h4>
            {summary.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-xs p-3 rounded-lg bg-muted/10 border border-border/10">
                <ChevronRight className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mutation Strategies breakdown */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider">Mutation Strategies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {promptFuzzingEngine.getStrategies().map((strat) => {
            const passRate = strategyPassRates.get(strat) ?? 0;
            return (
              <div key={strat} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono">{strat}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {strat === summary.weakestStrategy ? '⚠ weakest' : `${Math.round(passRate)}%`}
                  </span>
                </div>
                <Progress
                  value={passRate}
                  className="h-1.5"
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
