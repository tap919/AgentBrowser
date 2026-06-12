/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CyberWiki — Karpathy LLM-as-Compiler Cyber Knowledge Base Dashboard.
 *
 * Implements the three-layer architecture:
 *   Layer 1 — Raw Sources   (immutable, forensic-grade)
 *   Layer 2 — The Wiki      (LLM-maintained, ATT&CK-aligned pages)
 *   Layer 3 — Query Layer   (analyst interface; answers filed back as pages)
 *
 * Operations: Ingest · Browse · Query · Lint · Synthesize · AI-BOM
 */

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Upload,
  Search,
  Wrench,
  Layers,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  Globe,
  Hash,
  Cpu,
  Sparkles,
  Database,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';
import {
  karpathyCyberWiki,
} from '@/lib/security';
import type {
  RawSource,
  WikiPage,
  WikiQuery,
  IngestResult,
  WikiHealthReport,
  ThreatLandscapeSynthesis,
  RawSourceType,
} from '@/lib/security';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const severityVariant: Record<string, 'destructive' | 'secondary' | 'outline' | 'default'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
};

const healthColor: Record<WikiPage['health'], string> = {
  healthy: 'text-green-400',
  stale: 'text-yellow-400',
  orphaned: 'text-orange-400',
  contradicted: 'text-red-400',
};

const healthIcon: Record<WikiPage['health'], React.ReactNode> = {
  healthy: <CheckCircle2 className="w-3 h-3 text-green-400" />,
  stale: <AlertTriangle className="w-3 h-3 text-yellow-400" />,
  orphaned: <XCircle className="w-3 h-3 text-orange-400" />,
  contradicted: <AlertTriangle className="w-3 h-3 text-red-400" />,
};

const pageTypeIcon: Record<WikiPage['type'], React.ReactNode> = {
  'threat-actor': <Shield className="w-4 h-4 text-red-400" />,
  'tactic': <Layers className="w-4 h-4 text-blue-400" />,
  'technique': <Cpu className="w-4 h-4 text-purple-400" />,
  'cve': <AlertTriangle className="w-4 h-4 text-orange-400" />,
  'ioc': <Hash className="w-4 h-4 text-yellow-400" />,
  'asset-risk': <Database className="w-4 h-4 text-cyan-400" />,
  'threat-landscape': <Globe className="w-4 h-4 text-green-400" />,
  'query-result': <Search className="w-4 h-4 text-indigo-400" />,
};

const SAMPLE_SOURCES: Array<{ type: RawSourceType; title: string; origin: string; content: string }> = [
  {
    type: 'THREAT_INTEL_REPORT',
    title: 'APT29 Cloud Infrastructure Campaign — 2026 Q2',
    origin: 'https://example-cti.io/reports/apt29-2026',
    content: `APT29 (Cozy Bear) has been observed targeting cloud-hosted CI/CD pipelines using T1566 phishing emails to deliver credential-stealing payloads. 
Indicators include: 198.51.100.23, malicious-cdn.evil.com, a94a8fe5ccb19ba61c4c0873d391e987982fbbd3
The group uses T1078 Valid Accounts after initial compromise, then performs lateral movement via T1021 Remote Services (RDP/SSH).
Exfiltration uses T1041 over HTTPS to C2 at 203.0.113.44. Patch CVE-2024-1234 immediately.`,
  },
  {
    type: 'CVE_NVD_FEED',
    title: 'CVE-2024-44000 — Critical RCE in Apache',
    origin: 'https://nvd.nist.gov/vuln/detail/CVE-2024-44000',
    content: `CVE-2024-44000: Remote Code Execution vulnerability in Apache HTTP Server versions prior to 2.4.62.
CVSS Score: 9.8 (Critical). Exploit available in the wild. T1190 Exploit Public-Facing Application.
Affected: apache/httpd < 2.4.62. Patch status: patch-available. 
Associated with LockBit ransomware group activity. IOCs: lockbit-dropper.exe, 192.0.2.100`,
  },
  {
    type: 'IOC_LIST',
    title: 'LockBit 3.0 IOC Dump — June 2026',
    origin: 'https://example-osint.io/lockbit-iocs',
    content: `LockBit 3.0 indicators from recent incident response engagements.
IPs: 198.51.100.5, 203.0.113.77, 192.0.2.55
Domains: lockbit-pay.onion.example, exfil-cdn.badactor.net
Hashes (MD5): 5d41402abc4b2a76b9719d911017c592, 098f6bcd4621d373cade4e832627b4f6
Techniques observed: T1486 (ransomware encryption), T1562 (defense evasion), T1003 (credential dumping)`,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CyberWiki() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('wiki');
  const [pages, setPages] = useState<WikiPage[]>(() => karpathyCyberWiki.listPages());
  const [rawSources, setRawSources] = useState<RawSource[]>(() => karpathyCyberWiki.listRawSources());
  const [queryHistory, setQueryHistory] = useState<WikiQuery[]>(() => karpathyCyberWiki.getQueryHistory());
  const [healthReport, setHealthReport] = useState<WikiHealthReport | null>(null);
  const [synthesis, setSynthesis] = useState<ThreatLandscapeSynthesis | null>(null);
  const [lastIngestResult, setLastIngestResult] = useState<IngestResult | null>(null);
  const [queryText, setQueryText] = useState('');
  const [fileAsPage, setFileAsPage] = useState(false);
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
  const [customContent, setCustomContent] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isLinting, setIsLinting] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [filterType, setFilterType] = useState<WikiPage['type'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const stats = useMemo(() => karpathyCyberWiki.getStatistics(), [pages]);

  const filteredPages = useMemo(() => {
    return pages
      .filter(p => filterType === 'all' || p.type === filterType)
      .filter(p =>
        !searchTerm ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.summary.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [pages, filterType, searchTerm]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleIngestSample = (idx: number) => {
    setIsIngesting(true);
    setTimeout(() => {
      const s = SAMPLE_SOURCES[idx];
      const raw = karpathyCyberWiki.storeRawSource({ type: s.type, title: s.title, origin: s.origin, content: s.content });
      const result = karpathyCyberWiki.ingest(raw.id);
      setLastIngestResult(result);
      setPages(karpathyCyberWiki.listPages());
      setRawSources(karpathyCyberWiki.listRawSources());
      setIsIngesting(false);
    }, 600);
  };

  const handleIngestCustom = () => {
    if (!customContent.trim()) return;
    setIsIngesting(true);
    setTimeout(() => {
      const raw = karpathyCyberWiki.storeRawSource({
        type: 'THREAT_INTEL_REPORT',
        title: customTitle.trim() || 'Custom Threat Report',
        origin: 'analyst-input',
        content: customContent,
      });
      const result = karpathyCyberWiki.ingest(raw.id);
      setLastIngestResult(result);
      setPages(karpathyCyberWiki.listPages());
      setRawSources(karpathyCyberWiki.listRawSources());
      setCustomContent('');
      setCustomTitle('');
      setIsIngesting(false);
    }, 600);
  };

  const handleQuery = () => {
    if (!queryText.trim()) return;
    setIsQuerying(true);
    setTimeout(() => {
      karpathyCyberWiki.query(queryText, fileAsPage);
      setQueryHistory(karpathyCyberWiki.getQueryHistory());
      setPages(karpathyCyberWiki.listPages());
      setQueryText('');
      setIsQuerying(false);
    }, 400);
  };

  const handleLint = () => {
    setIsLinting(true);
    setTimeout(() => {
      const report = karpathyCyberWiki.lint();
      setHealthReport(report);
      setPages(karpathyCyberWiki.listPages());
      setIsLinting(false);
    }, 500);
  };

  const handleSynthesize = () => {
    setIsSynthesizing(true);
    setTimeout(() => {
      const s = karpathyCyberWiki.synthesizeThreatLandscape();
      setSynthesis(s);
      setPages(karpathyCyberWiki.listPages());
      setIsSynthesizing(false);
    }, 700);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Karpathy Cyber Wiki
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            LLM-as-Compiler · Three-Layer Threat Knowledge Base · MITRE ATT&CK Aligned
          </p>
        </div>
        <Badge variant="secondary" className="text-xs font-mono">
          NIST AI RMF · 2026
        </Badge>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: 'Raw Sources', value: stats.totalRawSources, icon: <Database className="w-4 h-4" />, color: 'text-cyan-400' },
          { label: 'Wiki Pages', value: stats.totalPages, icon: <BookOpen className="w-4 h-4" />, color: 'text-primary' },
          { label: 'ATT&CK Pages', value: stats.techniquePages, icon: <Cpu className="w-4 h-4" />, color: 'text-purple-400' },
          { label: 'IOC Pages', value: stats.iocPages, icon: <Hash className="w-4 h-4" />, color: 'text-yellow-400' },
          { label: 'Queries', value: stats.queriesAnswered, icon: <Search className="w-4 h-4" />, color: 'text-indigo-400' },
        ].map(stat => (
          <Card key={stat.label} className="bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <span className={stat.color}>{stat.icon}</span>
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="wiki" className="gap-1 text-xs"><BookOpen className="w-3 h-3" />Wiki</TabsTrigger>
          <TabsTrigger value="ingest" className="gap-1 text-xs"><Upload className="w-3 h-3" />Ingest</TabsTrigger>
          <TabsTrigger value="query" className="gap-1 text-xs"><Search className="w-3 h-3" />Query</TabsTrigger>
          <TabsTrigger value="lint" className="gap-1 text-xs"><Wrench className="w-3 h-3" />Lint</TabsTrigger>
          <TabsTrigger value="landscape" className="gap-1 text-xs"><Sparkles className="w-3 h-3" />Landscape</TabsTrigger>
        </TabsList>

        {/* ── Wiki Browser ─────────────────────────────────────────────────── */}
        <TabsContent value="wiki" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Search pages…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-48"
            />
            <div className="flex flex-wrap gap-1">
              {(['all', 'threat-actor', 'technique', 'cve', 'ioc', 'threat-landscape', 'query-result'] as const).map(t => (
                <Button
                  key={t}
                  size="sm"
                  variant={filterType === t ? 'secondary' : 'ghost'}
                  className="h-7 text-xs px-2"
                  onClick={() => setFilterType(t)}
                >
                  {t === 'all' ? 'All' : t}
                </Button>
              ))}
            </div>
          </div>

          {filteredPages.length === 0 ? (
            <Card className="bg-card/40">
              <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">The wiki is empty. Ingest a threat report to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredPages.map(page => (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="bg-card/60 cursor-pointer hover:bg-card/80 transition-colors"
                    onClick={() => setSelectedPage(selectedPage?.id === page.id ? null : page)}
                  >
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {pageTypeIcon[page.type]}
                          <CardTitle className="text-sm font-medium truncate">{page.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {page.severity && (
                            <Badge variant={severityVariant[page.severity] ?? 'outline'} className="text-xs">
                              {page.severity}
                            </Badge>
                          )}
                          <span title={page.health}>{healthIcon[page.health]}</span>
                        </div>
                      </div>
                      <CardDescription className="text-xs mt-1 line-clamp-2">{page.summary}</CardDescription>
                    </CardHeader>

                    <AnimatePresence>
                      {selectedPage?.id === page.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="px-4 pb-4 space-y-3">
                            <ScrollArea className="h-48">
                              <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">
                                {page.body}
                              </pre>
                            </ScrollArea>
                            {page.attackTechniqueIds.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {page.attackTechniqueIds.map(id => (
                                  <Badge key={id} variant="outline" className="text-xs font-mono">{id}</Badge>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Sources: {page.sourceIds.length}</span>
                              <span>Updated: {page.updatedAt.toLocaleDateString()}</span>
                              <span className={healthColor[page.health]}>Staleness: {page.staleness}%</span>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Ingest ───────────────────────────────────────────────────────── */}
        <TabsContent value="ingest" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sample sources */}
            <Card className="bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sample Threat Reports</CardTitle>
                <CardDescription className="text-xs">Click to ingest pre-built threat intelligence into the wiki.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {SAMPLE_SOURCES.map((s, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-start gap-2 h-auto py-3 px-3 text-left"
                    onClick={() => handleIngestSample(idx)}
                    disabled={isIngesting}
                  >
                    <FileText className="w-4 h-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.type}</p>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Custom ingest */}
            <Card className="bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ingest Custom Report</CardTitle>
                <CardDescription className="text-xs">Paste raw threat intelligence. IOCs and ATT&CK techniques are extracted automatically.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  type="text"
                  placeholder="Report title (optional)"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <textarea
                  placeholder="Paste threat report, IOC list, or advisory text here…"
                  value={customContent}
                  onChange={e => setCustomContent(e.target.value)}
                  className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
                <Button
                  className="w-full gap-2"
                  onClick={handleIngestCustom}
                  disabled={isIngesting || !customContent.trim()}
                >
                  {isIngesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isIngesting ? 'Ingesting…' : 'Ingest Report'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Ingest result */}
          <AnimatePresence>
            {lastIngestResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card className={`border ${lastIngestResult.promptInjectionDetected ? 'border-destructive/50' : 'border-green-500/30'} bg-card/40`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {lastIngestResult.promptInjectionDetected
                        ? <AlertTriangle className="w-4 h-4 text-destructive" />
                        : <CheckCircle2 className="w-4 h-4 text-green-400" />}
                      Ingest Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-green-400">{lastIngestResult.pagesCreated}</p>
                      <p className="text-xs text-muted-foreground">Pages Created</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-400">{lastIngestResult.pagesUpdated}</p>
                      <p className="text-xs text-muted-foreground">Pages Updated</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-yellow-400">{lastIngestResult.extractedIOCs.length}</p>
                      <p className="text-xs text-muted-foreground">IOCs Extracted</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-400">{lastIngestResult.mappedTechniques.length}</p>
                      <p className="text-xs text-muted-foreground">ATT&CK Mapped</p>
                    </div>
                    {lastIngestResult.warnings.length > 0 && (
                      <div className="col-span-2 sm:col-span-4">
                        {lastIngestResult.warnings.map((w, i) => (
                          <p key={i} className="text-xs text-destructive">{w}</p>
                        ))}
                      </div>
                    )}
                    {lastIngestResult.mappedTechniques.length > 0 && (
                      <div className="col-span-2 sm:col-span-4 flex flex-wrap gap-1">
                        {lastIngestResult.mappedTechniques.map(t => (
                          <Badge key={t} variant="outline" className="text-xs font-mono">{t}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Raw Sources list */}
          {rawSources.length > 0 && (
            <Card className="bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" /> Layer 1 — Raw Sources (Immutable)
                </CardTitle>
                <CardDescription className="text-xs">These records are never modified by the LLM — forensic-grade chain of evidence.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-52">
                  <div className="space-y-2">
                    {rawSources.map(src => (
                      <div key={src.id} className="flex items-start justify-between gap-2 p-2 rounded-md bg-background/40 text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{src.title}</p>
                          <p className="text-muted-foreground truncate">{src.type} · {src.origin}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {src.poisoningRiskScore > 40 && (
                            <Badge variant="destructive" className="text-xs">Risk {src.poisoningRiskScore}%</Badge>
                          )}
                          <Badge variant="outline" className="font-mono text-xs">{src.contentHash}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Query ────────────────────────────────────────────────────────── */}
        <TabsContent value="query" className="space-y-4 mt-4">
          <Card className="bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-400" /> Natural Language Query
              </CardTitle>
              <CardDescription className="text-xs">
                Ask anything about threat actors, TTPs, CVEs, or IOCs. Answers can be filed back as new wiki pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                placeholder="e.g. What TTPs does APT29 use against cloud infrastructure? · What CVEs are critical? · Show IOCs for LockBit"
                value={queryText}
                onChange={e => setQueryText(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleQuery(); }}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fileAsPage}
                    onChange={e => setFileAsPage(e.target.checked)}
                    className="h-3 w-3"
                  />
                  File answer as new wiki page (compounding knowledge)
                </label>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleQuery}
                  disabled={isQuerying || !queryText.trim()}
                >
                  {isQuerying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  {isQuerying ? 'Querying…' : 'Query Wiki'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Query history */}
          {queryHistory.length > 0 && (
            <Card className="bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Query History</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-3">
                    {[...queryHistory].reverse().map(q => (
                      <div key={q.id} className="p-3 rounded-md bg-background/40 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium">{q.text}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline" className="text-xs">{q.intent}</Badge>
                            {q.filedAsPage && <Badge variant="secondary" className="text-xs">📄 Filed</Badge>}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{q.answer}</div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Confidence: {q.confidence}%</span>
                          <span>Citations: {q.citedPageIds.length}</span>
                          <span>{q.answeredAt.toLocaleTimeString()}</span>
                        </div>
                        <Progress value={q.confidence} className="h-1" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Lint / Health Check ──────────────────────────────────────────── */}
        <TabsContent value="lint" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Wiki Health Check</h3>
              <p className="text-xs text-muted-foreground">Detects stale CVEs, orphaned IOCs, and contradictions between sources.</p>
            </div>
            <Button size="sm" onClick={handleLint} disabled={isLinting} className="gap-2">
              {isLinting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wrench className="w-3 h-3" />}
              {isLinting ? 'Running Lint…' : 'Run Lint'}
            </Button>
          </div>

          {healthReport ? (
            <div className="space-y-4">
              {/* Score */}
              <Card className="bg-card/60">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Wiki Health Score</span>
                    <span className={`text-xl font-bold ${healthReport.healthScore >= 80 ? 'text-green-400' : healthReport.healthScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {healthReport.healthScore}%
                    </span>
                  </div>
                  <Progress value={healthReport.healthScore} className="h-2" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                    <div><p className="text-green-400 font-bold text-lg">{healthReport.healthyPages}</p><p className="text-muted-foreground">Healthy</p></div>
                    <div><p className="text-yellow-400 font-bold text-lg">{healthReport.stalePages}</p><p className="text-muted-foreground">Stale</p></div>
                    <div><p className="text-orange-400 font-bold text-lg">{healthReport.orphanedPages}</p><p className="text-muted-foreground">Orphaned</p></div>
                    <div><p className="text-red-400 font-bold text-lg">{healthReport.contradictedPages}</p><p className="text-muted-foreground">Contradicted</p></div>
                  </div>
                </CardContent>
              </Card>

              {/* Specific issues */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card className="bg-card/60">
                  <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><AlertTriangle className="w-3 h-3 text-yellow-400" />Stale CVEs</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-yellow-400">{healthReport.staleCveCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">CVEs marked open but patched in body text</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/60">
                  <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><XCircle className="w-3 h-3 text-orange-400" />Orphaned IOCs</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-orange-400">{healthReport.orphanedIocCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">IOCs with no threat actor linkage</p>
                  </CardContent>
                </Card>
              </div>

              {/* Contradictions */}
              {healthReport.contradictions.length > 0 && (
                <Card className="bg-card/60 border-red-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-2"><AlertTriangle className="w-3 h-3 text-red-400" />Contradictions Detected</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-40">
                      <div className="space-y-2">
                        {healthReport.contradictions.map((c, i) => (
                          <div key={i} className="text-xs p-2 rounded-md bg-background/40">
                            <p className="text-red-400 font-medium">{c.field}</p>
                            <p className="text-muted-foreground mt-0.5">{c.description}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-muted-foreground">Report generated: {healthReport.generatedAt.toLocaleString()}</p>
            </div>
          ) : (
            <Card className="bg-card/40">
              <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
                <Wrench className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Run the lint check to assess wiki health and find issues.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Threat Landscape Synthesis ───────────────────────────────────── */}
        <TabsContent value="landscape" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Threat Landscape Synthesis</h3>
              <p className="text-xs text-muted-foreground">Auto-maintained summary replacing the weekly analyst briefing.</p>
            </div>
            <Button size="sm" onClick={handleSynthesize} disabled={isSynthesizing} className="gap-2">
              {isSynthesizing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {isSynthesizing ? 'Synthesizing…' : 'Synthesize'}
            </Button>
          </div>

          {synthesis ? (
            <div className="space-y-4">
              {/* Summary card */}
              <Card className="bg-card/60">
                <CardContent className="p-4">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">
                    {synthesis.summary}
                  </pre>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Top actors */}
                {synthesis.topActors.length > 0 && (
                  <Card className="bg-card/60">
                    <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><Shield className="w-3 h-3 text-red-400" />Top Threat Actors</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {synthesis.topActors.map(a => (
                        <div key={a.actorName} className="flex items-center justify-between gap-2">
                          <span className="text-xs truncate">{a.actorName}</span>
                          <div className="flex items-center gap-2 w-24">
                            <Progress value={a.activityScore} className="h-1 flex-1" />
                            <span className="text-xs text-muted-foreground w-8">{a.activityScore}%</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Top techniques */}
                {synthesis.topTechniques.length > 0 && (
                  <Card className="bg-card/60">
                    <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><Cpu className="w-3 h-3 text-purple-400" />Most Observed Techniques</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {synthesis.topTechniques.map(t => (
                        <div key={t.techniqueId} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-xs font-mono shrink-0">{t.techniqueId}</Badge>
                            <span className="text-xs truncate">{t.name}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">×{t.frequency}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Critical CVEs */}
              {synthesis.criticalCVEs.length > 0 && (
                <Card className="bg-card/60 border-destructive/30">
                  <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><AlertTriangle className="w-3 h-3 text-destructive" />Critical CVEs Tracked</CardTitle></CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {synthesis.criticalCVEs.map(cve => (
                      <Badge key={cve} variant="destructive" className="text-xs">{cve}</Badge>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Emerging threats */}
              {synthesis.emergingThreats.length > 0 && (
                <Card className="bg-card/60 border-orange-500/30">
                  <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><Zap className="w-3 h-3 text-orange-400" />Emerging Threats (Last 7 Days)</CardTitle></CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {synthesis.emergingThreats.map(t => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="bg-card/40">
              <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
                <Sparkles className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Click Synthesize to auto-generate the threat landscape briefing.</p>
                <p className="text-xs text-muted-foreground max-w-sm">Ingest some threat reports first to get meaningful insights.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* NIST AI RMF / Architecture Note */}
      <Card className="bg-card/30 border-dashed">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Architecture:</strong> Raw Sources (Layer 1) are immutable — the LLM never modifies them, preserving a forensic chain of evidence.
            The Wiki (Layer 2) compounds knowledge: each ingested report updates dozens of cross-linked pages automatically.
            The Query Layer (Layer 3) answers analyst questions and optionally files answers back as new pages.
            Prompt-injection patterns in ingested content are detected and quarantined before wiki updates.
            Aligns with <strong className="text-foreground">NIST AI RMF 2026</strong>: Govern (schema policy) · Map (ingest) · Measure (lint) · Manage (query).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
