import React from 'react';
import { 
  Network, 
  ShieldCheck, 
  Globe, 
  Wifi, 
  Lock, 
  Zap,
  ArrowUp,
  ArrowDown,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { mockTelemetry } from '@/lib/mockData';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const trafficData = [
  { time: '15:00', in: 120, out: 45 },
  { time: '15:10', in: 150, out: 55 },
  { time: '15:20', in: 110, out: 40 },
  { time: '15:30', in: 240, out: 120 },
  { time: '15:40', in: 180, out: 65 },
  { time: '15:50', in: 160, out: 50 },
];

export function NetworkDefense() {
  const { network } = mockTelemetry;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <Network className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Network Defense</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="bg-blue-500/5 text-blue-500 border-blue-500/20">
                <Lock className="w-3 h-3 mr-1" />
                ZTNA Active
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">Gateway: US-EAST-01</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Globe className="w-4 h-4" />
            VPN Settings
          </Button>
          <Button className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            Update Firewall
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card/40 border-border/50 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Live Traffic Analysis</CardTitle>
              <CardDescription>Deep Packet Inspection (DPI) telemetry</CardDescription>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Inbound</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Outbound</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="in" stroke="var(--primary)" fillOpacity={1} fill="url(#colorIn)" strokeWidth={2} />
                <Area type="monotone" dataKey="out" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOut)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card/40 border-border/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Network Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
                  <p className="text-[10px] text-muted-foreground uppercase font-mono mb-1">Inbound</p>
                  <div className="flex items-center gap-2">
                    <ArrowDown className="w-3 h-3 text-emerald-500" />
                    <span className="text-lg font-bold">{network.inbound}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
                  <p className="text-[10px] text-muted-foreground uppercase font-mono mb-1">Outbound</p>
                  <div className="flex items-center gap-2">
                    <ArrowUp className="w-3 h-3 text-blue-500" />
                    <span className="text-lg font-bold">{network.outbound}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium">Active Connections</span>
                  </div>
                  <span className="text-sm font-mono font-bold">{network.activeConnections}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium">Blocked Domains</span>
                  </div>
                  <span className="text-sm font-mono font-bold">{network.blockedDomains}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Detected Anomalies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {network.anomalies.map((anomaly, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-[11px] leading-relaxed text-amber-200/80">{anomaly}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
