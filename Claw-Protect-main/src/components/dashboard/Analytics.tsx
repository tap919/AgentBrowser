/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  Calendar,
  Download,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts';
import { Progress } from '@/components/ui/progress';

export function Analytics() {
  const [timeRange, setTimeRange] = useState('7d');

  const threatTimelineData = [
    { date: '04/05', threats: 45, blocked: 43, flagged: 2 },
    { date: '04/06', threats: 52, blocked: 48, flagged: 4 },
    { date: '04/07', threats: 38, blocked: 36, flagged: 2 },
    { date: '04/08', threats: 67, blocked: 61, flagged: 6 },
    { date: '04/09', threats: 41, blocked: 39, flagged: 2 },
    { date: '04/10', threats: 58, blocked: 54, flagged: 4 },
    { date: '04/11', threats: 63, blocked: 59, flagged: 4 },
  ];

  const threatCategoryData = [
    { name: 'Prompt Injection', value: 156, percentage: 63 },
    { name: 'Behavioral Drift', value: 48, percentage: 19 },
    { name: 'Data Exfiltration', value: 28, percentage: 11 },
    { name: 'Secrets Exposed', value: 15, percentage: 6 },
    { name: 'Other', value: 3, percentage: 1 },
  ];

  const agentActivityData = [
    { agent: 'openclaw-main', actions: 1247, anomalies: 3, uptime: 99.9 },
    { agent: 'hermes-worker', actions: 892, anomalies: 1, uptime: 99.8 },
    { agent: 'hermes-research', actions: 645, anomalies: 5, uptime: 99.2 },
    { agent: 'openclaw-tools', actions: 423, anomalies: 0, uptime: 100 },
    { agent: 'shadow-agent-01', actions: 78, anomalies: 12, uptime: 87.3 },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">Deep insights into security posture and threat intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        {['24h', '7d', '30d', '90d'].map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(range)}
          >
            {range}
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Threats"
          value="391"
          change="+23%"
          trend="up"
          icon={Activity}
        />
        <MetricCard
          title="Blocked Rate"
          value="95.4%"
          change="+2.1%"
          trend="up"
          icon={TrendingUp}
        />
        <MetricCard
          title="Active Agents"
          value="5"
          change="0"
          trend="neutral"
          icon={Activity}
        />
        <MetricCard
          title="Avg Response Time"
          value="2.3ms"
          change="-0.5ms"
          trend="down"
          icon={Activity}
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Timeline */}
        <Card className="lg:col-span-2 bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Threat Timeline</CardTitle>
            <CardDescription>Security events over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={threatTimelineData}>
                  <defs>
                    <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }} />
                  <Area type="monotone" dataKey="threats" stroke="#ef4444" fillOpacity={1} fill="url(#colorThreats)" />
                  <Area type="monotone" dataKey="blocked" stroke="#10b981" fillOpacity={1} fill="url(#colorBlocked)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Threat Categories */}
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Threat Categories</CardTitle>
            <CardDescription>Distribution by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={threatCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {threatCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {threatCategoryData.map((category, index) => (
                  <div key={category.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span>{category.name}</span>
                    </div>
                    <span className="font-mono">{category.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Activity Table */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Agent Activity Analysis</CardTitle>
          <CardDescription>Performance metrics by agent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Agent ID</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Total Actions</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Anomalies</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Uptime</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {agentActivityData.map((agent) => (
                  <tr key={agent.agent} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm">{agent.agent}</span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="font-mono text-sm">{agent.actions.toLocaleString()}</span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <Badge variant={agent.anomalies > 5 ? 'destructive' : agent.anomalies > 0 ? 'secondary' : 'outline'}>
                        {agent.anomalies}
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="font-mono text-sm">{agent.uptime}%</span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <Badge variant={agent.uptime > 99 ? 'default' : agent.uptime > 95 ? 'secondary' : 'destructive'}>
                        {agent.uptime > 99 ? 'Excellent' : agent.uptime > 95 ? 'Good' : 'Critical'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MITRE ATT&CK Coverage */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            MITRE ATT&amp;CK Coverage
          </CardTitle>
          <CardDescription>
            Claw Protect detection coverage across the kill-chain — inspired by the tool taxonomy in the CAI offensive framework (recon → exfil → C2)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MitreHeatmap />
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Detailed Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="predictions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="correlations">Correlations</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="predictions" className="mt-4 space-y-4">
              <div className="p-4 rounded-lg bg-muted/20 border border-border/20">
                <h3 className="font-semibold mb-2">Threat Forecast (Next 7 Days)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Based on historical patterns and current trends
                </p>
                <div className="space-y-2">
                  <PredictionItem
                    trend="Increasing"
                    threat="Prompt Injection Attempts"
                    likelihood="78%"
                    impact="Medium"
                  />
                  <PredictionItem
                    trend="Stable"
                    threat="Behavioral Anomalies"
                    likelihood="45%"
                    impact="Low"
                  />
                  <PredictionItem
                    trend="Decreasing"
                    threat="Data Exfiltration"
                    likelihood="23%"
                    impact="High"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="correlations" className="mt-4">
              <div className="p-4 rounded-lg bg-muted/20 border border-border/20">
                <h3 className="font-semibold mb-2">Security Event Correlations</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Patterns detected across multiple security dimensions
                </p>
                <ul className="space-y-2 text-sm">
                  <li>• 89% of behavioral drift events precede data exfiltration attempts</li>
                  <li>• Prompt injections spike 2-3 hours after new agent deployments</li>
                  <li>• Shadow agents detected 67% more often during weekend hours</li>
                  <li>• Secret exposures correlate with hasty code commits (r=0.74)</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="recommendations" className="mt-4">
              <div className="space-y-3">
                <RecommendationItem
                  priority="High"
                  title="Review Shadow Agent Activity"
                  description="shadow-agent-01 shows 12 anomalies with 87% uptime. Immediate investigation recommended."
                />
                <RecommendationItem
                  priority="Medium"
                  title="Update Prompt Injection Signatures"
                  description="3 new injection patterns detected in the wild. Update detection rules."
                />
                <RecommendationItem
                  priority="Low"
                  title="Optimize Baseline Learning"
                  description="hermes-research has sufficient data for more granular baseline. Consider refinement."
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, change, trend, icon: Icon }: any) {
  const trendColors = {
    up: change.startsWith('+') ? 'text-emerald-500' : 'text-red-500',
    down: change.startsWith('-') ? 'text-emerald-500' : 'text-red-500',
    neutral: 'text-muted-foreground',
  };

  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Icon className="w-5 h-5 text-primary" />
          <span className={`text-xs font-mono ${trendColors[trend as keyof typeof trendColors]}`}>
            {change}
          </span>
        </div>
        <div className="text-3xl font-bold mb-1">{value}</div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
      </CardContent>
    </Card>
  );
}

function PredictionItem({ trend, threat, likelihood, impact }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
      <div className="flex-1">
        <p className="font-semibold text-sm">{threat}</p>
        <p className="text-xs text-muted-foreground">Trend: {trend}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Likelihood</p>
          <p className="font-mono text-sm">{likelihood}</p>
        </div>
        <Badge variant={impact === 'High' ? 'destructive' : impact === 'Medium' ? 'secondary' : 'outline'}>
          {impact}
        </Badge>
      </div>
    </div>
  );
}

function RecommendationItem({ priority, title, description }: any) {
  return (
    <div className="flex gap-3 p-4 rounded-lg bg-muted/20 border border-border/20">
      <Badge
        variant={priority === 'High' ? 'destructive' : priority === 'Medium' ? 'secondary' : 'outline'}
        className="h-fit"
      >
        {priority}
      </Badge>
      <div className="flex-1">
        <h4 className="font-semibold text-sm mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// ─── MITRE ATT&CK heatmap ─────────────────────────────────────────────────────
// Coverage inspired by the CAI offensive tool taxonomy:
// reconnaissance → exploitation → privilege_escalation → lateral_movement
// → data_exfiltration → command_and_control
// https://github.com/tap919/Overlay-Cyber-Security-/tree/main/src/cai/tools

const mitrePhases = [
  {
    tactic: 'Reconnaissance',
    color: '#3b82f6',
    techniques: [
      { name: 'Port Scanning', covered: true },
      { name: 'OSINT Gathering', covered: true },
      { name: 'Shodan / Censys', covered: false },
      { name: 'DNS Enumeration', covered: true },
    ],
  },
  {
    tactic: 'Initial Access / Exploitation',
    color: '#f59e0b',
    techniques: [
      { name: 'Prompt Injection', covered: true },
      { name: 'Web App Exploit', covered: true },
      { name: 'Supply Chain', covered: true },
      { name: 'Credential Stuffing', covered: false },
    ],
  },
  {
    tactic: 'Privilege Escalation',
    color: '#ef4444',
    techniques: [
      { name: 'Token Abuse', covered: true },
      { name: 'SUID / Sudo', covered: false },
      { name: 'Permission Drift', covered: true },
      { name: 'Agent Impersonation', covered: true },
    ],
  },
  {
    tactic: 'Lateral Movement',
    color: '#8b5cf6',
    techniques: [
      { name: 'SSH Pivoting', covered: false },
      { name: 'Agent Hand-off Exploit', covered: true },
      { name: 'Tool Hijacking', covered: true },
      { name: 'Shadow Agent Spawn', covered: true },
    ],
  },
  {
    tactic: 'Data Exfiltration',
    color: '#ec4899',
    techniques: [
      { name: 'DNS Beaconing', covered: true },
      { name: 'HTTP Covert Channel', covered: true },
      { name: 'Large Batch Transfer', covered: true },
      { name: 'Steganography', covered: false },
    ],
  },
  {
    tactic: 'Command & Control',
    color: '#10b981',
    techniques: [
      { name: 'Outbound C2 Detect', covered: true },
      { name: 'Periodic Beacons', covered: true },
      { name: 'Encrypted C2', covered: false },
      { name: 'Domain Fronting', covered: false },
    ],
  },
];

function MitreHeatmap() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mitrePhases.map(phase => {
          const coveredCount = phase.techniques.filter(t => t.covered).length;
          const pct = Math.round((coveredCount / phase.techniques.length) * 100);
          return (
            <div
              key={phase.tactic}
              className="p-4 rounded-xl bg-muted/20 border border-border/30 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: phase.color }}
                >
                  {phase.tactic}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {coveredCount}/{phase.techniques.length}
                </span>
              </div>
              <Progress value={pct} className="h-1.5" />
              <div className="grid grid-cols-2 gap-1.5">
                {phase.techniques.map(t => (
                  <div
                    key={t.name}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-mono border ${
                      t.covered
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-muted/30 border-border/20 text-muted-foreground line-through'
                    }`}
                  >
                    <span>{t.covered ? '✓' : '·'}</span>
                    <span className="truncate">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground font-mono">
        Coverage derived from active Claw Protect modules. Uncovered (strike-through) techniques are candidates for future detection rules.
      </p>
    </div>
  );
}
