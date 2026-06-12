/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Settings,
  Activity,
  Zap,
  Eye,
  TrendingUp,
  GitBranch,
  Database,
  Network,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Power,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';
import { 
  agentMonitor,
  promptInjectionDetector,
  secretsScanner,
  dataExfiltrationMonitor,
  agentUptimeMonitor,
} from '@/lib/security';

export function CommandCenter() {
  const [autoMode, setAutoMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeModules, setActiveModules] = useState({
    promptInjection: true,
    behavioralMonitoring: true,
    secretsScanning: true,
    dataExfiltration: true,
    identityVerification: true,
    supplyChain: true,
    uptimeMonitoring: true,
  });

  const [systemStatus, setSystemStatus] = useState({
    threatsBlocked: 247,
    agentsMonitored: 5,
    anomaliesDetected: 12,
    uptimePercent: 99.9,
  });

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setSystemStatus(prev => ({
        ...prev,
        threatsBlocked: prev.threatsBlocked + Math.floor(Math.random() * 3),
        anomaliesDetected: prev.anomaliesDetected + Math.floor(Math.random() * 2),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const toggleModule = (module: keyof typeof activeModules) => {
    setActiveModules(prev => ({ ...prev, [module]: !prev[module] }));
  };

  return (
    <div className={`space-y-6 ${fullscreen ? 'fixed inset-0 z-50 bg-background p-6 overflow-auto' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="w-10 h-10 text-primary animate-pulse" />
            Command Center
          </h1>
          <p className="text-muted-foreground mt-2">Full spectrum security operations and control</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFullscreen(!fullscreen)}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-sm font-medium">Auto Mode</span>
            <Switch checked={autoMode} onCheckedChange={setAutoMode} />
            {autoMode && (
              <Badge variant="secondary" className="animate-pulse">
                <Power className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Threats Blocked"
          value={systemStatus.threatsBlocked}
          icon={Shield}
          color="text-emerald-500"
          trend="+12 today"
        />
        <StatusCard
          title="Agents Monitored"
          value={systemStatus.agentsMonitored}
          icon={Activity}
          color="text-blue-500"
          trend="All online"
        />
        <StatusCard
          title="Anomalies Detected"
          value={systemStatus.anomaliesDetected}
          icon={AlertTriangle}
          color="text-amber-500"
          trend="3 require review"
        />
        <StatusCard
          title="System Uptime"
          value={`${systemStatus.uptimePercent}%`}
          icon={CheckCircle2}
          color="text-emerald-500"
          trend="Last 30 days"
        />
      </div>

      {/* Main Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Module Controls */}
        <Card className="lg:col-span-1 bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Security Modules
            </CardTitle>
            <CardDescription>Fine-tune protection systems</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                <ModuleControl
                  name="Prompt Injection Detection"
                  description="Detects 25+ injection patterns"
                  active={activeModules.promptInjection}
                  onToggle={() => toggleModule('promptInjection')}
                  level="critical"
                />
                <ModuleControl
                  name="Behavioral Monitoring"
                  description="Tracks agent drift and anomalies"
                  active={activeModules.behavioralMonitoring}
                  onToggle={() => toggleModule('behavioralMonitoring')}
                  level="high"
                />
                <ModuleControl
                  name="Secrets Scanning"
                  description="20+ credential pattern detection"
                  active={activeModules.secretsScanning}
                  onToggle={() => toggleModule('secretsScanning')}
                  level="critical"
                />
                <ModuleControl
                  name="Data Exfiltration Monitor"
                  description="Transfer tracking and beaconing detection"
                  active={activeModules.dataExfiltration}
                  onToggle={() => toggleModule('dataExfiltration')}
                  level="high"
                />
                <ModuleControl
                  name="Identity Verification"
                  description="Agent-to-agent authentication"
                  active={activeModules.identityVerification}
                  onToggle={() => toggleModule('identityVerification')}
                  level="medium"
                />
                <ModuleControl
                  name="Supply Chain Verification"
                  description="Tool source and typosquatting detection"
                  active={activeModules.supplyChain}
                  onToggle={() => toggleModule('supplyChain')}
                  level="high"
                />
                <ModuleControl
                  name="Uptime Monitoring"
                  description="Heartbeat and crash detection"
                  active={activeModules.uptimeMonitoring}
                  onToggle={() => toggleModule('uptimeMonitoring')}
                  level="medium"
                />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Center Panel - Real-time Visualization */}
        <Card className="lg:col-span-2 bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Live Threat Visualization
            </CardTitle>
            <CardDescription>Real-time security event stream</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="events" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="teamposture">Red / Blue</TabsTrigger>
              </TabsList>
              
              <TabsContent value="events" className="mt-4">
                <ScrollArea className="h-[500px]">
                  <EventStream />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="network" className="mt-4">
                <div className="h-[500px] flex items-center justify-center">
                  <NetworkTopology />
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-4">
                <div className="h-[500px] overflow-auto">
                  <ThreatAnalytics />
                </div>
              </TabsContent>

              <TabsContent value="teamposture" className="mt-4">
                <div className="h-[500px] overflow-auto">
                  <RedBluePosture />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Auto Mode Configuration */}
      <AnimatePresence>
        {autoMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Auto Mode Active
                </CardTitle>
                <CardDescription>
                  System is automatically responding to threats with smart defaults
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="font-medium text-sm">Auto-Block Threats</p>
                      <p className="text-xs text-muted-foreground">High severity only</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="font-medium text-sm">Smart Baselines</p>
                      <p className="text-xs text-muted-foreground">Learning agent patterns</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="font-medium text-sm">Auto-Updates</p>
                      <p className="text-xs text-muted-foreground">Signatures refreshed daily</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusCard({ title, value, icon: Icon, color, trend }: any) {
  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg bg-muted/50 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{title}</p>
          <p className="text-[10px] text-muted-foreground">{trend}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ModuleControl({ name, description, active, onToggle, level }: any) {
  const levelColors = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-blue-500',
  };

  return (
    <div className="flex items-start justify-between p-4 rounded-lg bg-muted/30 border border-border/30 hover:border-primary/30 transition-all">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">{name}</p>
          <Badge variant="outline" className={`text-[9px] ${levelColors[level as keyof typeof levelColors]}`}>
            {level}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={active} onCheckedChange={onToggle} />
    </div>
  );
}

function EventStream() {
  const mockEvents = [
    { id: 1, type: 'Threat Blocked', message: 'Prompt injection attempt detected and blocked', severity: 'high', time: '2s ago' },
    { id: 2, type: 'Anomaly', message: 'Agent openclaw-main accessed unusual resource', severity: 'medium', time: '15s ago' },
    { id: 3, type: 'Success', message: 'Behavioral baseline updated for hermes-worker', severity: 'low', time: '1m ago' },
    { id: 4, type: 'Alert', message: 'Data transfer to untrusted domain detected', severity: 'high', time: '2m ago' },
    { id: 5, type: 'Success', message: 'Secret scan completed - no exposures found', severity: 'low', time: '5m ago' },
  ];

  const severityColors = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };

  return (
    <div className="space-y-3">
      {mockEvents.map(event => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/20"
        >
          <div className={`w-2 h-2 mt-2 rounded-full ${severityColors[event.severity as keyof typeof severityColors]}`} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-muted-foreground uppercase">{event.type}</span>
              <span className="text-[10px] text-muted-foreground">{event.time}</span>
            </div>
            <p className="text-sm">{event.message}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function NetworkTopology() {
  return (
    <div className="text-center space-y-4">
      <Network className="w-16 h-16 mx-auto text-primary animate-pulse" />
      <div>
        <h3 className="font-semibold">Network Visualization</h3>
        <p className="text-sm text-muted-foreground">Real-time agent communication topology</p>
      </div>
      <div className="flex items-center justify-center gap-8 mt-8">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
            <Shield className="w-6 h-6 text-emerald-500" />
          </div>
          <span className="text-xs font-mono">openclaw-main</span>
        </div>
        <div className="w-16 h-px bg-border" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center">
            <GitBranch className="w-6 h-6 text-blue-500" />
          </div>
          <span className="text-xs font-mono">hermes-worker</span>
        </div>
      </div>
    </div>
  );
}

function ThreatAnalytics() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Threat Distribution (24h)</h3>
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs">Prompt Injection</span>
              <span className="text-xs font-mono">156 (63%)</span>
            </div>
            <Progress value={63} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs">Behavioral Anomalies</span>
              <span className="text-xs font-mono">48 (19%)</span>
            </div>
            <Progress value={19} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs">Data Exfiltration Attempts</span>
              <span className="text-xs font-mono">28 (11%)</span>
            </div>
            <Progress value={11} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs">Exposed Secrets</span>
              <span className="text-xs font-mono">15 (6%)</span>
            </div>
            <Progress value={6} className="h-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Red / Blue Team Posture ──────────────────────────────────────────────────
// Inspired by the red_teamer.py and blue_teamer.py agents in the CAI framework.
// Red team = simulated attack surface / attacker perspective.
// Blue team = defender coverage across the same domains.

const redTeamCoverage = [
  { area: 'Prompt Injection', attackVectors: 31, mitigated: 28, risk: 90 },
  { area: 'Memory Exploitation', attackVectors: 12, mitigated: 7, risk: 58 },
  { area: 'Network / C2', attackVectors: 18, mitigated: 15, risk: 83 },
  { area: 'Privilege Escalation', attackVectors: 9, mitigated: 7, risk: 78 },
  { area: 'Data Exfiltration', attackVectors: 14, mitigated: 12, risk: 86 },
  { area: 'Supply Chain', attackVectors: 8, mitigated: 6, risk: 75 },
];

const blueTeamCapabilities = [
  { capability: 'Behavioural Baselining', maturity: 90, status: 'operational' as const },
  { capability: 'Prompt Guardrails', maturity: 95, status: 'operational' as const },
  { capability: 'DFIR / Threat Hunting', maturity: 70, status: 'active' as const },
  { capability: 'Secrets Detection', maturity: 88, status: 'operational' as const },
  { capability: 'Network DPI', maturity: 75, status: 'active' as const },
  { capability: 'Identity Verification', maturity: 80, status: 'operational' as const },
];

type BlueStatus = 'operational' | 'active' | 'degraded';

const blueStatusVariant: Record<BlueStatus, 'default' | 'secondary' | 'destructive'> = {
  operational: 'default',
  active: 'secondary',
  degraded: 'destructive',
};

function RedBluePosture() {
  return (
    <div className="space-y-6 p-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Red team */}
        <div>
          <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            Red Team — Attack Surface
          </h3>
          <div className="space-y-3">
            {redTeamCoverage.map(item => (
              <div key={item.area} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{item.area}</span>
                  <Badge variant={item.risk >= 85 ? 'default' : item.risk >= 70 ? 'secondary' : 'destructive'} className="text-[9px]">
                    {item.risk}% mitigated
                  </Badge>
                </div>
                <Progress value={item.risk} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground">
                  {item.mitigated} / {item.attackVectors} vectors covered
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Blue team */}
        <div>
          <h3 className="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            Blue Team — Defender Capabilities
          </h3>
          <div className="space-y-3">
            {blueTeamCapabilities.map(cap => (
              <div key={cap.capability} className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{cap.capability}</span>
                  <Badge variant={blueStatusVariant[cap.status]} className="text-[9px] capitalize">
                    {cap.status}
                  </Badge>
                </div>
                <Progress value={cap.maturity} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground">Maturity: {cap.maturity}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-muted/20 border border-border/20 text-[10px] text-muted-foreground font-mono">
        Red / Blue posture inspired by CAI red_teamer and blue_teamer agents from the Overlay-Cyber-Security framework.
      </div>
    </div>
  );
}
